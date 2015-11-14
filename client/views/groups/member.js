///////////////////////////////////////////////////////////////////////////////
// Members

Template.member.helpers({
	'member': function () {
		var member = balance_getGroupMember(Session.get("selected_group"), Session.get("selected_member"));
		Template.member.original_status = member.status;
		return member;
	},
	'balance': function () {
	  var groupId = Session.get("selected_group");
	  if (!groupId)
		  return null;

	  return balance_formatAmount(
			balance_GetUserBalance(Session.get("selected_member"), groupId)
		)
	},
	'total_balance': function () {
		if (Meteor.userId() == Session.get("selected_member")) {
			return balance_formatAmount(
				balance_GetUserBalance(Session.get("selected_member"))
			);
		} else {
			return null;
		}
	},
	'is_user_group_coordinator': function() {
		return balance_isGroupCoordinator(Session.get("selected_group"), Meteor.userId());
	},
	'status_type_options': [
		{ option: "active" },
		{ option: "left" },
		{ option: "invited" },
		{ option: "requested" },
		{ option: "rejected" },
	],
	'approval_type_options': [
		{ option: "all" },
		{ option: "debits" },
		{ option: "none" },
	],
	'credit': function () {
	  // look up the credit between the current user and the selected user
	  var selectedMember = Session.get("selected_member");
	  var creditLine = CreditLines.findOne({creditor: Meteor.userId(), debtor: selectedMember});
	  var amount = 0.00;
	  if (creditLine && typeof creditLine.amount == 'number') {
			amount = creditLine.amount;
	  }
	  return amount.toFixed(2);
	},
	'credit_to_me': function () {
	  // look up the credit between the selected user and the current user
	  var selectedMember = Session.get("selected_member");
	  var creditLine = CreditLines.findOne({creditor: selectedMember, debtor: Meteor.userId()});
	  var amount = 0.00;
	  if (creditLine && typeof creditLine.amount == 'number') {
			amount = creditLine.amount;
	  }
	  return amount.toFixed(2);
	},
	'me': function () {
	  return Meteor.userId() == Session.get("selected_member");
	},
	'note': function () {
	  return Session.get("member_note");
	},
	'error': function () {
	  return Session.get("member_error");
	},
});

Template.member.events({
	'change .approval_type': function (event, template) {
		Meteor.call('updateApproval', {
				groupId: Session.get("selected_group"),
				approval: template.find(".approval_type").value,
			}, function (error, profile) {
				if (!error) {
					Session.set("member_note", "Approval type has been updated.");
				} else {
					Session.set("member_error", error.reason);
				}
			}
		);
	},
  'focus, blur .approval_type': function (event) {
    Session.set("member_note", '');
    Session.set("member_error", '');
  },
	'change .status_type': function (event, template) {
		Meteor.call('updateStatus', {
				groupId: Session.get("selected_group"),
				userId: Session.get("selected_member"),
				status: template.find(".status_type").value,
			}, function (error, profile) {
				if (!error) {
					Session.set("member_note", "Status type has been updated.");
				} else {
					Session.set("member_error", error.reason);
					template.find(".status_type").value = Template.member.original_status;
				}
			}
		);
	},
  'focus, blur .status_type': function (event) {
    Session.set("member_note", '');
    Session.set("member_error", '');
  },
  'click .extend': function (event, template) {
		var amount = parseFloat(template.find(".credit").value);
		if (amount >= 0) {
			Meteor.call('extendCredit', {
				debtor: Session.get("selected_member"),
				amount: parseFloat(parseFloat(amount).toFixed(2)),
				}, function (error, profile) {
					if (!error) {
						Session.set("member_note", "Credit limit has been updated.");
					} else {
						Session.set("member_error", error.reason);
  				}
				}
			);
		} else {
			Session.set("member_note", "Credit limit can not be negative.");
		}
  },
  'focus .credit': function (event) {
    Session.set("member_note", '');
    Session.set("member_error", '');
  },
  'click .member-return': function () {
    Session.set("selected_member", null);
  },
});

Template.member_detail.helpers({
	'selected': function () {
	  return Session.equals("selected_member", this._id) ? "selected" : '';
	},
	'displayName': function () {
	  return displayName(this);
	},
	'balance': function () {
	  var groupId = Session.get("selected_group");
	  if (!groupId)
		  return null;

		return balance_formatAmount(balance_GetUserBalance(this._id, groupId));
	},
});

Template.member_detail.events({
  'click': function () {
 		Session.set("selected_transaction", null);
 		Session.set("transaction_error", null);
    Session.set("selected_member", this._id);
    Session.set("member_note", '');
    Session.set("member_error", '');
  },
});

Template.editApprovalTypeOption.helpers({
	'selected': function () {
		var member = balance_getGroupMember(Session.get("selected_group"), Session.get("selected_member"));
		return this.option == member.approval;
	},
});

Template.editStatusTypeOption.helpers({
	'selected': function () {
		var member = balance_getGroupMember(Session.get("selected_group"), Session.get("selected_member"));
	  return this.option == member.status;
	},
});

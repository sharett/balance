///////////////////////////////////////////////////////////////////////////////
// Members

Template.member.member = function () {
  return Meteor.users.findOne(Session.get("selected_member"));
};

Template.member.balance = function () {
  var groupId = Session.get("selected_group");
  if (!groupId)
	  return null;

  return balance_formatAmount(
		balance_GetUserBalance(Session.get("selected_member"), groupId)
	);
};

Template.member.total_balance = function () {
	if (Meteor.userId() == Session.get("selected_member")) {
		return balance_formatAmount(
			balance_GetUserBalance(Session.get("selected_member"))
		);
	} else {
		return null;
	}
};

Template.member.credit = function () {
  // look up the credit between the current user and the selected user
  var selectedMember = Session.get("selected_member");
  var creditLine = CreditLines.findOne({creditor: Meteor.userId(), debtor: selectedMember});
  var amount = 0.00;
  if (creditLine && typeof creditLine.amount == 'number') {
	amount = creditLine.amount;
  }
  return amount.toFixed(2);
};

Template.member.credit_to_me = function () {
  // look up the credit between the selected user and the current user
  var selectedMember = Session.get("selected_member");
  var creditLine = CreditLines.findOne({creditor: selectedMember, debtor: Meteor.userId()});
  var amount = 0.00;
  if (creditLine && typeof creditLine.amount == 'number') {
		amount = creditLine.amount;
  }
  return amount.toFixed(2);
};


Template.member.me = function () {
  return Meteor.userId() == Session.get("selected_member");
};

Template.member.note = function () {
  return Session.get("member_note");
};
  
Template.member.events({
  'click .extend': function (event, template) {
	var amount = parseFloat(template.find(".credit").value);
	if (amount >= 0) {
    Meteor.call('extendCredit', {
			debtor: Session.get("selected_member"),
			amount: parseFloat(parseFloat(amount).toFixed(2)),
			}, function (error, profile) {
				if (!error) {
					Session.set("member_note", "Credit limit has been updated.");
				}
			});
		} else {
			Session.set("member_note", "Credit limit can not be negative.");
		}
  },
  'focus .credit': function (event) {
    Session.set("member_note", '');
  },
  'click .member-return': function () {
    Session.set("selected_member", null);
  },
});

Template.member_detail.selected = function () {
  return Session.equals("selected_member", this._id) ? "selected" : '';
};

Template.member_detail.displayName = function () {
  return displayName(this);
};

Template.member_detail.balance = function () {
  var groupId = Session.get("selected_group");
  if (!groupId)
	  return null;
	  
	return balance_formatAmount(balance_GetUserBalance(this._id, groupId));
};

Template.member_detail.events({
  'click': function () {
    Session.set("selected_member", this._id);
    Session.set("member_note", null);
  },
});


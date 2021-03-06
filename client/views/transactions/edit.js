///////////////////////////////////////////////////////////////////////////////
// editTransaction dialog

openTransactionDialog = function (action, type) {
	Session.set("editTransactionCreate", false);
	Session.set("editTransactionEdit", false);
	Session.set("editTransactionCopy", false);

	switch (action) {
		case 'edit':
			// is there a selected transaction?
			var transactionId = Session.get("selected_transaction");
			if (!transactionId)
				return;

			// load it
			var transaction = Transactions.findOne(transactionId);

			// are all members current?
			if (!balance_splitsMembersCurrent(transaction)) {
				Session.set("transaction_error",
					"Some of the parties in this transaction have left the group.  This transaction " +
					"cannot be edited.");
				return;
			}

			// set the dialog fields
			Session.set("editTransactionTransactionDate", balance_formatDate(transaction.date));
			Session.set("editTransactionTransactionDescription", transaction.description);
			Session.set("editTransactionTransactionTotal", transaction.total);
			Session.set("editTransactionTransactionType", balance_verifyTransactionType(transaction.type));
			Session.set("editTransactionEdit", true);

   	  Session.set("showTransactionDialog", 'edit');
			Modal.show('editTransaction');
			break;
		case 'copy':
			// is there a selected transaction?
			var transactionId = Session.get("selected_transaction");
			if (!transactionId)
				return;

			// load it
			var transaction = Transactions.findOne(transactionId);

			// are all members current?
			if (!balance_splitsMembersCurrent(transaction)) {
				Session.set("transaction_error",
					"Some of the parties in this transaction have left the group.  This transaction " +
					"cannot be copied.");
				return;
			}

			// set the dialog fields
			Session.set("editTransactionTransactionDate", balance_formatDate(transaction.date));
			Session.set("editTransactionTransactionDescription", transaction.description);
			Session.set("editTransactionTransactionTotal", transaction.total);
			Session.set("editTransactionTransactionType", balance_verifyTransactionType(transaction.type));
			Session.set("editTransactionCopy", true);

			Session.set("showTransactionDialog", 'copy');
			Modal.show('editTransaction');
			break;
		case 'create':
		default:
			// set the default dialog fields
			var d = new Date();
			Session.set("editTransactionTransactionDate", (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear());
			Session.set("editTransactionTransactionDescription", '');
			Session.set("editTransactionTransactionTotal", 0.00);
			Session.set("editTransactionTransactionType", balance_verifyTransactionType(type));
			Session.set("editTransactionCreate", true);

      Session.set("showTransactionDialog", 'create');
			Modal.show('editTransaction');
			break;
  }

	Session.set("transaction_error", null);
  Session.set("editTransactionError", null);
  Session.set("editTransactionTotal", "$0.00");
  Session.set("editTransactionTotalOk", "alert-success");
};

Template.editTransaction.helpers({
	'group_members': function () {
		var membersDb = balance_GetGroupMembers(Session.get("selected_group"));

		var transactionId = Session.get("selected_transaction");
	 	var members = new Array();
		if (transactionId) {
			// update
			var transaction = Transactions.findOne(transactionId);
			membersDb.forEach(function (member) {
				// skip inactive members
				if (member.status != 'active')
					return;

				transaction.splits.forEach(function (split) {
					if (split.userId == member._id) {
						if (split.amount < 0) {
							member.debit = -(split.amount);
						} else {
							member.credit = split.amount;
						}
						member.reimburse_checkbox = (split.amount != 0);
					}
				});
				members.push(member);
			});
		  return members;
		} else {
			// create
			membersDb.forEach(function (member) {
				// skip inactive members
				if (member.status != 'active')
					return;

				member.reimburse_checkbox = true;
				members.push(member);
			});
		  return members;
		}
	},
	'type_description': function () {
		if (Session.get("editTransactionTransactionType") == "other") {
			return "transaction";
		} else {
			return Session.get("editTransactionTransactionType");
		}
	},
	'charge': function () {
		return Session.get("editTransactionTransactionType") == "charge";
	},
	'payment': function () {
		return Session.get("editTransactionTransactionType") == "payment";
	},
	'reimbursement': function () {
		return Session.get("editTransactionTransactionType") == "reimbursement";
	},
	'total': function () {
		return Session.get("editTransactionTotal");
	},
	'total_ok': function () {
		return Session.get("editTransactionTotalOk");
	},
	'error': function () {
		return Session.get("editTransactionError");
	},
	'create': function() {
		return Session.get("editTransactionCreate")
	},
	'edit': function() {
		return Session.get("editTransactionEdit")
	},
	'copy': function() {
		return Session.get("editTransactionCopy")
	},
	'transaction_date': function() {
		return Session.get("editTransactionTransactionDate")
	},
	'transaction_description': function() {
		return Session.get("editTransactionTransactionDescription")
	},
	'transaction_total': function() {
		return Session.get("editTransactionTransactionTotal")
	},
	'transaction_type': function() {
		return Session.get("editTransactionTransactionType")
	},
});


Template.editTransaction.events({
  'click .save': function (event, template) {
		var transactionId = Session.get("selected_transaction");
		var groupId = Session.get("selected_group");

		// get common entries
		var date = template.find(".transaction-date").value;
		var description = template.find(".transaction-description").value;
		var debits = template.findAll(".transaction-debit-amount");
		var credits = template.findAll(".transaction-credit-amount");

		// create the splits array
		var splits = new Array();

		// which type of transaction?
		switch (Session.get("editTransactionTransactionType")) {
			case 'charge':
			case 'payment':
				// create a simple opposing split
				var credit = template.find(".transaction-credit").value;
				var debit = template.find(".transaction-debit").value;
				var total = template.find(".transaction-total").value;

				// is the value zero or less?
				if (parseFloat(total) <= 0) {
					Session.set("editTransactionError", "Please enter a value greater than zero.");
					return;
				}

				// are the parties the same?
				if (credit && credit == debit) {
					Session.set("editTransactionError", "The parties can't be the same.");
					return;
				}

				// add the debit and credit
				splits.push({
					userId: credit,
					amount: parseFloat(total),
					description: '',
				});
				splits.push({
					userId: debit,
					amount: -(parseFloat(total)),
					description: '',
				});
				break;
			case 'reimbursement':
			default:
				balance_prepareSplits(splits, debits, credits);
				break;
		}

		// create, copy or update?
		if (Session.get("showTransactionDialog") == 'create' ||
		    Session.get("showTransactionDialog") == 'copy') {
			// create a new transaction
			Meteor.call('insertTransaction', {
					groupId: groupId,
					date: date,
					description: description,
					type: Session.get("editTransactionTransactionType"),
					splits: splits,
				},
				function (error, transaction) {
					if (error) {
						Session.set("editTransactionError", error.reason);
					} else {
						Session.set("showTransactionDialog", false);
						Session.set("selected_transaction", null);
						Modal.hide('editTransaction');
					}
			});
		} else {
			// update an existing transaction
			Meteor.call('updateTransaction', {
				  transactionId: transactionId,
					groupId: groupId,
					date: date,
					description: description,
					type: Session.get("editTransactionTransactionType"),
					splits: splits,
				},
				function (error, transaction) {
					if (error) {
						Session.set("editTransactionError", error.reason);
					} else {
						Session.set("showTransactionDialog", false);
						Session.set("selected_transaction", null);
						Modal.hide('editTransaction');
					}
			});
		}
  },
  'click .cancel': function () {
    Session.set("showTransactionDialog", false);
		Session.set("selected_transaction", null);
		Modal.hide('editTransaction');
  },
  'keyup .transaction-amount': function (event, template) {
		// total the entered transactions
		var debits = template.findAll(".transaction-debit-amount");
		var credits = template.findAll(".transaction-credit-amount");
		var total = new Number(0.00);

	  // total the debits
    debits.forEach(function (amount) {
			var amountValue = parseFloat(amount.value);
		  if (!isNaN(amountValue))
				total -= parseFloat(amountValue.toFixed(2));
	  });
	  // total the credits
	  credits.forEach(function (amount) {
			var amountValue = parseFloat(amount.value);
		  if (!isNaN(amountValue))
				total += parseFloat(amountValue.toFixed(2));
	  });

	  // update the total display
	  total = parseFloat(total.toFixed(2));
	  Session.set("editTransactionTotal", '$' + total.toFixed(2));
	  Session.set("editTransactionTotalOk", (total == 0.00) ? "success" : "danger");
	},
  'keyup .transaction-total': function (event, template) {
		// is this a reimbursement?
		if (Session.get("editTransactionTransactionType") == 'reimbursement') {
			// recalculate the debits and credits
			balance_recalculateReimbursement(template);
		}
	},
  'click .transaction-reimburse': function (event, template) {
		// recalculate the debits and credits
		balance_recalculateReimbursement(template);
	},
  'change .transaction-credit': function (event, template) {
		if (Session.get("editTransactionTransactionType") == 'reimbursement') {
			// recalculate the debits and credits
			balance_recalculateReimbursement(template);
		}
	},
});

Template.editTransactionMember.helpers({
	'displayName': function () {
  	return displayName(this);
	},
});

Template.editTransactionMemberReimbursement.helpers({
	'displayName': function () {
	  return displayName(this);
	},
});

// Debit options

Template.editTransactionMemberDebitOption.helpers({
	'displayName': function () {
	  return displayName(this);
	},
	'selected': function () {
		return this.debit > 0;
	},
});

// Credit options

Template.editTransactionMemberCreditOption.helpers({
	'displayName': function () {
	  return displayName(this);
	},
	'selected': function () {
	  return this.credit > 0;
	},
});

// Helper functions

function balance_recalculateReimbursement(template) {
	var precision = 2;
	var minimumUnit = Math.pow(10, -precision);

	// recalculate the reimbursement entries
	var credit = template.find(".transaction-credit").value;
	var total = template.find(".transaction-total").value;
	var checkboxes = new Array();
	template.findAll(".transaction-reimburse").forEach(function (box) {
		if (box.checked) {
			// record each checked checkbox
			checkboxes.push(box);
		} else {
			// clear unchecked entries
			template.find("#d_" + box.id.substr(2)).value = '';
		}
		if (box.id.substr(2) != credit) {
			// clear all credit entries except the one receiving the reimbursement
			template.find("#c_" + box.id.substr(2)).value = '';
		}
	});

	// is anyone selected to reimburse?
	if (!credit) {
		// no, clear everything
		total = 0;
	}

	// ensure it is a float to the right precision
	total = balance_toFixed(total, precision);
	if (isNaN(total))
		total = 0;
	if (total < 0)
		total = 0;

	// are any checkboxes checked?
	if (checkboxes.length) {
		// how much for each?
		var eachAmount = total / checkboxes.length;
		var leftover = 0;
		checkboxes.forEach(function (box) {
			// round the amount to the specified precision
			var thisAmount = balance_toFixed(eachAmount, precision);
			// if there's a difference, meaning we've lost precision, record
			// that difference
			if (thisAmount != eachAmount) {
				leftover += (thisAmount - eachAmount);

				// when the difference reaches one cent, adjust this entry
				if (leftover.toFixed(8) >= minimumUnit) {
					thisAmount -= minimumUnit;
					leftover -= minimumUnit;
				}
				if (leftover.toFixed(8) <= -minimumUnit) {
					thisAmount += minimumUnit;
					leftover += minimumUnit;
				}
			}
			// update the entry value
			template.find("#d_" + box.id.substr(2)).value =
				balance_toFixed(thisAmount, precision).toFixed(precision);
		});

		// assign total to the person being reimbursed
		template.find("#c_" + credit).value = total.toFixed(precision);
	} else {
		// clear the entry of the person being reimbursed
		template.find("#c_" + credit).value = '';
	}

	Session.set("editTransactionTotal", '$0.00');
	Session.set("editTransactionTotalOk", "success");
}

///////////////////////////////////////////////////////////////////////////////
// editTransaction dialog

openTransactionDialog = function (action, type) {
	Template.editTransaction.create = false;
	Template.editTransaction.edit = false;
	Template.editTransaction.copy = false;

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
			Template.editTransaction.transaction_date = balance_formatDate(transaction.date);
			Template.editTransaction.transaction_description = transaction.description;
			Template.editTransaction.transaction_total = transaction.total;
			Template.editTransaction.transaction_type = balance_verifyTransactionType(transaction.type);
			Template.editTransaction.edit = true;
   	  Session.set("showTransactionDialog", 'edit');
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
			Template.editTransaction.transaction_date = balance_formatDate(transaction.date);
			Template.editTransaction.transaction_description = transaction.description;
			Template.editTransaction.transaction_total = transaction.total;
			Template.editTransaction.transaction_type = balance_verifyTransactionType(transaction.type);
			Template.editTransaction.copy = true;
			Session.set("showTransactionDialog", 'copy');
			break;
		case 'create':
		default:
			// set the default dialog fields
			var d = new Date();
			Template.editTransaction.transaction_date = 
				(d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
			Template.editTransaction.transaction_description = '';
			Template.editTransaction.transaction_total = 0.00;
			Template.editTransaction.transaction_type = balance_verifyTransactionType(type);
			Template.editTransaction.create = true;
      Session.set("showTransactionDialog", 'create');
			break;
  }
	
	Session.set("transaction_error", null);
  Session.set("editTransactionError", null);
  Session.set("editTransactionTotal", "$0.00");
  Session.set("editTransactionTotalOk", "alert-success");
};

Template.editTransaction.group_members = function () {
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
};

Template.editTransaction.type_description = function () {
	if (Template.editTransaction.transaction_type == "other") {
		return "transaction";
	} else {
		return Template.editTransaction.transaction_type;
	}
};

Template.editTransaction.charge = function () {
	return Template.editTransaction.transaction_type == "charge";
};

Template.editTransaction.payment = function () {
	return Template.editTransaction.transaction_type == "payment";
};

Template.editTransaction.reimbursement = function () {
	return Template.editTransaction.transaction_type == "reimbursement";
};

Template.editTransaction.total = function () {
	return Session.get("editTransactionTotal");
};

Template.editTransaction.total_ok = function () {
	return Session.get("editTransactionTotalOk");
};

Template.dialogs.showTransactionDialog = function () {
	var show = Session.get("showTransactionDialog");
	if (!show)
		Session.set("selected_transaction", null);
	
	return show;
};

Template.editTransaction.events({
  'click .save': function (event, template) {
		var transactionId = Session.get("selected_transaction");
		var groupId = Session.get("selected_group");
		
		// get common entries
		var date = template.find(".transaction-date").value;
		var description = template.find(".transaction-description").value;
		var debits = template.findAll(".transaction-debit");
		var credits = template.findAll(".transaction-credit");

		// create the splits array
		var splits = new Array();

		// which type of transaction?
		switch (Template.editTransaction.transaction_type) {
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
					type: Template.editTransaction.transaction_type,
					splits: splits,
				}, 
				function (error, transaction) {
					if (error) {
						Session.set("editTransactionError", error.reason);
					} else {
						Session.set("showTransactionDialog", false);	
					}
			});
		} else {
			// update an existing transaction
			Meteor.call('updateTransaction', {
				  transactionId: transactionId,
					groupId: groupId,
					date: date,
					description: description,
					type: Template.editTransaction.transaction_type,
					splits: splits,
				}, 
				function (error, transaction) {
					if (error) {
						Session.set("editTransactionError", error.reason);
					} else {
						Session.set("showTransactionDialog", false);	
					}
			}); 
		}
  },
  'click .cancel': function () {
    Session.set("showTransactionDialog", false);
  },
  'keyup .transaction-amount': function (event, template) {
		// total the entered transactions
		var debits = template.findAll(".transaction-debit");
		var credits = template.findAll(".transaction-credit");
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
	  Session.set("editTransactionTotalOk", (total == 0.00) ? "success" : "error");
	},
  'keyup .transaction-total': function (event, template) {
		// is this a reimbursement?
		if (Template.editTransaction.transaction_type == 'reimbursement') {
			// recalculate the debits and credits
			balance_recalculateReimbursement(template);
		}
	},
  'click .transaction-reimburse': function (event, template) {
		// recalculate the debits and credits
		balance_recalculateReimbursement(template);
	},
  'change .transaction-credit': function (event, template) {
		if (Template.editTransaction.transaction_type == 'reimbursement') {
			// recalculate the debits and credits
			balance_recalculateReimbursement(template);
		}
	},
});

Template.editTransaction.error = function () {
  return Session.get("editTransactionError");
};

Template.editTransactionMember.displayName = function () {
  return displayName(this);
};

Template.editTransactionMemberReimbursement.displayName = function () {
  return displayName(this);
};

// Debit options

Template.editTransactionMemberDebitOption.displayName = function () {
  return displayName(this);
};

Template.editTransactionMemberDebitOption.selected = function () {
  return this.debit > 0;
};

// Credit options

Template.editTransactionMemberCreditOption.displayName = function () {
  return displayName(this);
};

Template.editTransactionMemberCreditOption.selected = function () {
  return this.credit > 0;
};

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

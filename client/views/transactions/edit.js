///////////////////////////////////////////////////////////////////////////////
// editTransaction dialog

openTransactionDialog = function (create) {
  if (!create) {
		// is there a selected transaction?
		var transactionId = Session.get("selected_transaction");
		if (!transactionId)
			return;
	  var transaction = Transactions.findOne(transactionId);
	  Template.editTransaction.transaction_date = transaction.date;
    Template.editTransaction.transaction_description = transaction.description;
    Template.editTransaction.create = false;
  } else {
		var d = new Date();
    Template.editTransaction.transaction_date = 
			(d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear().toString().substr(-2);
    Template.editTransaction.transaction_description = '';
    Template.editTransaction.create = true;
  }

  Session.set("editTransactionError", null);
  Session.set("editTransactionTotal", "$0.00");
  Session.set("editTransactionTotalOk", "alert-success");
  Session.set("showTransactionDialog", create ? 'create' : 'update');
};

Template.editTransaction.group_members = function () {
	var membersDb = balance_GetGroupMembers(Session.get("selected_group"));
	
	var transactionId = Session.get("selected_transaction");
	if (transactionId) {
  	var members = new Array();
		var transaction = Transactions.findOne(transactionId);
		membersDb.forEach(function (member) {
			transaction.splits.forEach(function (split) {
				if (split.userId == member._id) {
					if (split.amount < 0) {
						member.debit = -(split.amount);
					} else {
						member.credit = split.amount;
					}
				}
			});
			members.push(member);
		});
	  return members;
	} else {
		return membersDb;
	}
};

Template.editTransaction.total = function () {
	return Session.get("editTransactionTotal");
};

Template.editTransaction.total_ok = function () {
	return Session.get("editTransactionTotalOk");
};

Template.dialogs.showTransactionDialog = function () {
  return Session.get("showTransactionDialog");
};

Template.editTransaction.events({
  'click .save': function (event, template) {
		var transactionId = Session.get("selected_transaction");
		var groupId = Session.get("selected_group");
		
		var date = template.find(".transaction-date").value;
		var description = template.find(".transaction-description").value;
		var debits = template.findAll(".transaction-debit");
		var credits = template.findAll(".transaction-credit");
				
		// prepare splits
		var splits = new Array();
		balance_prepareSplits(splits, debits, credits);
		
		if (Session.get("showTransactionDialog") == 'create') {
			// create a new transaction
			Meteor.call('insertTransaction', {
					groupId: groupId,
					date: date,
					description: description,
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
	  
    debits.forEach(function (amount) {
			var amountValue = parseFloat(amount.value);
		  if (!isNaN(amountValue))
				total -= parseFloat(amountValue.toFixed(2));
	  });
	  credits.forEach(function (amount) {
			var amountValue = parseFloat(amount.value);
		  if (!isNaN(amountValue))
				total += parseFloat(amountValue.toFixed(2));
	  });
	  
	  total = parseFloat(total.toFixed(2));
	  Session.set("editTransactionTotal", '$' + total.toFixed(2));
	  Session.set("editTransactionTotalOk", (total == 0.00) ? "success" : "error");
	},
});

Template.editTransaction.error = function () {
  return Session.get("editTransactionError");
};

Template.editTransactionMember.displayName = function () {
  return displayName(this);
};


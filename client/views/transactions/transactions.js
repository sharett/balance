///////////////////////////////////////////////////////////////////////////////
// Transactions

Template.transactions.transactions = function () {
  var selected_group = Session.get("selected_group");
	
  if (selected_group) {
		// load the names of the users in this group
		var group = Groups.findOne(selected_group);
		var members = Meteor.users.find({_id: {$in: group.members}});
		var member_assoc = new Array();
		members.forEach(function (member) {
			member_assoc[member._id] = displayName(member);
		});

		// load the transactions for this group
		var transactionsDb = Transactions.find(
			{ groupId: selected_group }, 
			{sort: {date: -1, description: 1}}
		);
		Session.set("transaction_count", transactionsDb.count());
		
		// put the debits and credits together and format
		var transactions = new Array();
		transactionsDb.forEach(function (transaction) {
			var debits = new Array();
			var credits = new Array();
			transaction.splits.forEach(function (split) {
				if (split.amount < 0) {
					debits.push(member_assoc[split.userId] + ' $' + 
						balance_formatAmount(Math.abs(split.amount)));
				} else {
					credits.push(member_assoc[split.userId] + ' $' + 
					  balance_formatAmount(split.amount));
				}
			});
			transaction.debits = debits.join('; ');
			transaction.credits = credits.join('; ');
			
			// format the total
			transaction.total = '$' + balance_formatAmount(transaction.total);
			
			// add to the rebuilt list
			transactions.push(transaction);
		});
		
		return transactions;
  } else {
		Session.set("transaction_count", 0);
		return null;
  }
};

Template.transactions.transaction_count = function() {
  return Session.get("transaction_count");
};

Template.transactions.events({
  'click .transaction-add': function () {
    Session.set("selected_transaction", null);
    openTransactionDialog(true);  // create
  },
});

Template.transaction.selected = function () {
  return Session.equals("selected_transaction", this._id);
};

Template.transaction.events({
  'click .transaction-edit': function () {
    Session.set("selected_transaction", this._id);
    openTransactionDialog(false);  // edit
  },
  'click .transaction-remove': function () {
		if (confirm("Are you sure you want to remove this transaction?")) {
			// remove the transaction
			Meteor.call('removeTransaction', {
					transactionId: this._id,
				}, 
				function (error, transaction) {
					if (error) {
						alert(error.reason);
					} else {
						Session.set("selected_transaction", null);
					}
			});
		}
  },
});


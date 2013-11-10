///////////////////////////////////////////////////////////////////////////////
// Transactions

Template.transactions.search_query = function () {
	return Session.get("transaction_filter_query");
};

Template.transactions.members = function () {
	return balance_GetGroupMembers(Session.get("selected_group"));
};

Template.transactions.filter_member_name = function () {
	var filter_member = Session.get("transaction_filter_member");
	if (filter_member) {
	  var user = Meteor.users.findOne(filter_member);
	  return displayName(user);
	} else {
		return "Member";
	}
};

Template.transactions.filter_member = function () {
	return Session.get("transaction_filter_member");
};

Template.transactions.months = function () {
	var selected_group = Session.get("selected_group");
	if (!selected_group)
		return null;
	
	var transactionsDates = Transactions.find(
		{ groupId: selected_group },
		{ sort: { date: -1 } }
	);
	
	var dateArray = new Array();
	var oldMonth = 0;
	var oldYear = 0;
	var monthArray = [
		"January", "February", "March", "April",
		"May", "June", "July", "August",
		"September", "October", "November", "December"
	];
	transactionsDates.forEach(function (transaction) {
		var date = new Date(transaction.date);
		var month = date.getMonth();
		var year = date.getFullYear();
		if (year < 1970)
			year += 100;
		if (oldMonth != month || oldYear != year) {
			dateArray.push({month: month, year: year, description: monthArray[month] + ' ' + year});
			oldMonth = month;
			oldYear = year;
		}
	});
	
	return dateArray;
};

Template.transactions.filter_month = function () {
	return Session.get("transaction_filter_month");
};

Template.transactions.transactions = function () {
  var selected_group = Session.get("selected_group");
	var approval_required = false;

  if (selected_group) {
		// load the names of the users in this group
		var group = Groups.findOne(selected_group);
		var memberAssoc = new Array();
		group.members.forEach(function (member) {
			// add this user to the list, noting inactive members
			var user = Meteor.users.findOne(member.userId);
			member.displayName = displayName(user);
			member.active = (member.status == 'active');
			memberAssoc[member.userId] = member;
		});
		
		// build the filters
		var transactionFind = {
			groupId: selected_group
		};
		
		// filter by query?
		var filter_query = Session.get("transaction_filter_query");
		if (filter_query) {
			transactionFind["$or"] = [
				{ description: { $regex: '.*' + filter_query + '.*', $options: 'i' } },
			  { total: { $regex: '.*' + filter_query + '.*', $options: 'i' } },
			  { "splits.amount": { $regex: '.*' + filter_query + '.*', $options: 'i' } },
			  { "splits.description": { $regex: '.*' + filter_query + '.*', $options: 'i' } },
			];
		}
		
		// filter by member?
		var filter_member = Session.get("transaction_filter_member");
		if (filter_member) {
			transactionFind["splits.userId"] = filter_member;
		}
		
		// filter by month?
		var filter_month = Session.get("transaction_filter_month");
		if (filter_month) {
			var start = new Date(filter_month.year, filter_month.month, 1);
			filter_month.month += 1;
			if (filter_month.month >= 11) {
				filter_month.month = 0;
				filter_month.year += 1;
			}
			var end = new Date(filter_month.year, filter_month.month, 1);
			transactionFind["date"] = {
				$gte: start, $lt: end
			};
		}
		
		// load the transactions for this group
		var transactionsDb = Transactions.find(
			transactionFind, 
			{ sort: { date: -1, description: 1 } }
		);
		Session.set("transaction_count", transactionsDb.count());
		
		// put the debits and credits together and format
		var transactions = new Array();
		transactionsDb.forEach(function (transaction) {
			var debits = new Array();
			var credits = new Array();
			transaction.approved = true;
			transaction.splits.forEach(function (split) {
				if (split.amount < 0) {
					debits.push({ 
						member: memberAssoc[split.userId],
						amount: ' $' + balance_formatAmount(Math.abs(split.amount)),
						approved: split.approved,
					});
				} else {
					credits.push({ 
						member: memberAssoc[split.userId],
						amount: ' $' + balance_formatAmount(split.amount),
						approved: split.approved,
					});
				}
				// can this user approve?
				if (Meteor.userId() == split.userId) {
					// is this transaction approved?
					if (!split.approved) {
						transaction.approved = false; // no
						approval_required = true;
					}
				}
			});
			
			debits.sort(function(a, b) {
				if (a.member.displayName < b.member.displayName)
					return -1;
				if (a.member.displayName > b.member.displayName)
					return 1;
				return 0;
			});
			
			credits.sort(function(a, b) {
				if (a.member.displayName < b.member.displayName)
					return -1;
				if (a.member.displayName > b.member.displayName)
					return 1;
				return 0;
			});

			transaction.debits = debits;
			transaction.credits = credits;
			
			// format the total
			transaction.total = '$' + balance_formatAmount(transaction.total);
			
			// format the date
			transaction.date = balance_formatDate(transaction.date);
			
			// add to the rebuilt list
			transactions.push(transaction);
		});
		
		// sort the transactions putting unapproved ones first
		transactions.sort( function(a, b) {
			return a.approved - b.approved;
		});

		// was approval required?
		Session.set("transactions_approval_required", approval_required);
				
		return transactions;
  } else {
		Session.set("transaction_count", 0);
		return null;
  }
};

Template.transactions.error = function() {
	return Session.get("transaction_error");
};

Template.transactions.approval_required = function() {
	return Session.get("transactions_approval_required");
};

Template.transactions.transaction_count = function() {
  return Session.get("transaction_count");
};

Template.transactions.events({
	'keyup .search-query': function(event, template) {
		Session.set("transaction_filter_query", template.find(".search-query").value);
	},
  'click .transaction-filter-month-none': function () {
    Session.set("transaction_filter_month", null);
  },
  'click .transaction-filter-member-none': function () {
    Session.set("transaction_filter_member", null);
  },
  'click .transaction-add-charge': function () {
    Session.set("selected_transaction", null);
    openTransactionDialog('create', "charge");  // create
  },
  'click .transaction-add-payment': function () {
    Session.set("selected_transaction", null);
    openTransactionDialog('create', "payment");  // create
  },
  'click .transaction-add-reimbursement': function () {
    Session.set("selected_transaction", null);
    openTransactionDialog('create', "reimbursement");  // create
  },
  'click .transaction-add': function () {
    Session.set("selected_transaction", null);
    openTransactionDialog('create', "other");  // create
  },
});

// Filter month

Template.filter_month.selected = function () {
  return _.isEqual(Session.get("transaction_filter_month"), this);
};

Template.filter_month.events({
	'click': function () {
    Session.set("transaction_filter_month", this);
  },
});

// Filter member

Template.filter_member.selected = function () {
  return Session.equals("transaction_filter_member", this._id);
};

Template.filter_member.events({
	'click': function () {
    Session.set("transaction_filter_member", this._id);
  },
});

// Transaction

Template.transaction.selected = function () {
  return Session.equals("selected_transaction", this._id);
};

Template.transaction.events({
  'click .transaction-approve': function (event, template) {
    Meteor.call('approveTransaction', {
				transactionId: this._id,
				approved: true,
			}, 
			function (error, transaction) {
				Session.set("transaction_error", error ? error.reason : null);
			}
		);
  },
  'click .transaction-edit': function () {
    Session.set("selected_transaction", this._id);
    openTransactionDialog('edit', "");  // edit
  },
  'dblclick .transaction': function () {
    Session.set("selected_transaction", this._id);
    openTransactionDialog('edit', "");  // edit
  },
  'click .transaction-copy': function () {
    Session.set("selected_transaction", this._id);
    openTransactionDialog('copy', "");  // edit
  },
  'click .transaction-remove': function () {
		Session.set("selected_transaction", this._id);
	  // are all members current?
	  var transaction = Transactions.findOne(this._id);
	  if (!transaction || !balance_splitsMembersCurrent(transaction)) {
			Session.set("transaction_error", 
				"Some of the parties in this transaction have left the group.  This transaction " +
				"cannot be removed.");
			return;
		}

		if (confirm("Are you sure you want to remove this transaction?")) {
			// remove the transaction
			Meteor.call('removeTransaction', {
					transactionId: this._id,
				}, 
				function (error, transaction) {
					Session.set("transaction_error", error ? error.reason : null);
					if (!error) {
						Session.set("selected_transaction", null);
					}
			});
		}
  },
});


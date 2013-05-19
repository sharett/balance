
///////////////////////////////////////////////////////////////////////////

balance_GetUserBalance = function(userId, groupId) {
	var balance = 0.00;
	var query;
	
	if (groupId) {
		query = { 
			'splits.userId': userId, 
			groupId: groupId
		};
	} else {
		query = { 
			'splits.userId': userId 
		};
	}
	
	// find all matching transactions and total the split amounts
	// where the userId matches
	var transactions = Transactions.find(query, { splits: 1 });
	transactions.forEach(function (transaction) {
		transaction.splits.forEach(function (split) {
			if (split.userId == userId) 
				balance += parseFloat(split.amount.toFixed(2));
		});
	});
	
	return parseFloat(balance.toFixed(2));
};

balance_GetGroupMembers = function(groupId) {
	// load the names of the users in this group
	var group = Groups.findOne(groupId);
	if (!group)
		return null;
	
	return Meteor.users.find({_id: {$in: group.members}});
};

balance_prepareSplits = function(splits, debits, credits) {
	// splits is an array of:
	//  userId, amount, description
	// debits and credits are DOM element arrays.  The Id is
	//  either c_(userId) or d_(userId)
	debits.forEach(function (debit) {
		if (typeof debit.id !== "string")
		  return;
		if (isNaN(parseFloat(debit.value)))
		  return;
		  
		splits.push({
			userId: debit.id.substr(2),
			amount: -(parseFloat(debit.value)),
			description: '',
		});
	});
	credits.forEach(function (credit) {
		if (typeof credit.id !== "string")
		  return;
		if (isNaN(parseFloat(credit.value)))
		  return;
		  
		splits.push({
			userId: credit.id.substr(2),
			amount: parseFloat(credit.value),
			description: '',
		});
	});
	
	return true;
};

balance_formatAmount = function(amount) {
	amount = amount.toFixed(2);
	if (amount.substr(-3) == '.00')
		amount = amount.substr(0, amount.length - 3);
		
	return amount;
};

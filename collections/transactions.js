///////////////////////////////////////////////////////////////////////////////
// Transactions

/*
* .date
* .description
* .total
* .splits.userId
*        .amount
*        .description
* 
*/

Transactions = new Meteor.Collection("transactions");

//////////////////////////////////

Meteor.methods({
	insertTransaction: function (options) {
    options = options || {};

		balance_transactionPrepare(options);
		
		return Transactions.insert({
			groupId: options.groupId,
			date: options.date,
			description: options.description,
			total: options.total,
			splits: options.splits,
		});
  },
  // options should include: transactionId
  updateTransaction: function (options) {
    options = options || {};

    // transactionId
    if (! (typeof options.transactionId === "string" && options.transactionId.length))
      throw new Meteor.Error(400, "Transaction ID missing.");

		balance_transactionPrepare(options);
		
		return Transactions.update(options.transactionId, {
			groupId: options.groupId,
			date: options.date,
			description: options.description,
			total: options.total,
			splits: options.splits,
		});
  },
  removeTransaction: function (options) {
    options = options || {};

    // transactionId
    if (! (typeof options.transactionId === "string" && options.transactionId.length))
      throw new Meteor.Error(400, "Transaction ID missing.");

		return Transactions.remove(options.transactionId);
  },
});

function balance_transactionPrepare(options) {
  // groupId
  if (! (typeof options.groupId === "string" && options.groupId.length))
    throw new Meteor.Error(400, "A groupId is required");

  // load the group's members
  var group = Groups.findOne(options.groupId);
  if (!group)
    throw new Meteor.Error(400, "The group doesn't exist.");

  // date
  var date = new Date(options.date);
  if (!balance_isValidDate(date))
    throw new Meteor.Error(400, "The date is invalid.");
    
  // description
  if (! (typeof options.description === "string" && options.description.length))
    throw new Meteor.Error(400, "A description is required.");
  
  // splits
  if (! (typeof options.splits === "object"))
    throw new Meteor.Error(400, "Splits must be an object.");
    
  var splitTotal = 0.00;
  var amount;
  options.total = 0.00;
  options.splits.forEach(function (split) {
    // userId
    if (! (typeof split.userId === "string" && split.userId.length))
      throw new Meteor.Error(400, "Each split must have a userId.");
    // is user in this group?
    if (!_.contains(group.members, split.userId))
      throw new Meteor.Error(400, "User is not a member of this group.");
    // amount
    if (! (typeof split.amount === "number"))
      throw new Meteor.Error(400, "Each split must have an amount.");
    // description
    if (! (typeof split.description === "string"))
      throw new Meteor.Error(400, "Each split's description must be a string.");
    // total the splits
    amount = parseFloat(parseFloat(split.amount).toFixed(2));
    splitTotal += amount;
    if (amount > 0) {
		  options.total += amount;
	  }
  });
  splitTotal = parseFloat(splitTotal.toFixed(2));
  
  // total of the splits must equal to zero
  if (splitTotal != 0)
	  throw new Meteor.Error(400, "The total of all debits and credits must equal zero.");

  return true;
}

function balance_isValidDate(d) {
  if ( Object.prototype.toString.call(d) !== "[object Date]" )
    return false;
  return !isNaN(d.getTime());
}

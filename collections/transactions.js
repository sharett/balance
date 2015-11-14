///////////////////////////////////////////////////////////////////////////////
// Transactions

/*
* .groupId
* .date
* .description
* .total
* .type (payment, charge, reimbursement, other)
* .splits.userId
*        .amount
*        .description
* 			 .approved (boolean)
*
*/

Transactions = new Meteor.Collection("transactions");

Meteor.methods({
	insertTransaction: function (options) {
    options = options || {};

		balance_transactionPrepare(options, this.userId);

		return Transactions.insert({
			groupId: options.groupId,
			date: options.date,
			description: options.description,
			total: options.total,
			type: options.type,
			splits: options.splits,
		});
  },
  // options should include: transactionId
  updateTransaction: function (options) {
    options = options || {};

    // transactionId
    if (! (typeof options.transactionId === "string" && options.transactionId.length))
      throw new Meteor.Error(400, "Transaction ID missing.");

	  // are all members current?
	  var transaction = Transactions.findOne(options.transactionId);
	  if (!balance_splitsMembersCurrent(transaction))
			throw new Meteor.Error(400,
				"Some of the parties in this transaction have left the group.  This transaction " +
				"cannot be edited.");

		balance_transactionPrepare(options, this.userId);

		return Transactions.update(options.transactionId, {
			groupId: options.groupId,
			date: options.date,
			description: options.description,
			total: options.total,
			type: options.type,
			splits: options.splits,
		});
  },
  removeTransaction: function (options) {
    options = options || {};

    // transactionId
    if (! (typeof options.transactionId === "string" && options.transactionId.length))
      throw new Meteor.Error(400, "Transaction ID missing.");

	  // are all members current?
	  var transaction = Transactions.findOne(options.transactionId);
	  if (!balance_splitsMembersCurrent(transaction))
			throw new Meteor.Error(400,
				"Some of the parties in this transaction have left the group.  This transaction " +
				"cannot be removed.");

		return Transactions.remove(options.transactionId);
  },
  // options should include: transactionId, approved
  approveTransaction: function (options) {
    options = options || {};

		// logged in?
    if (!this.userId)
      throw new Meteor.Error(403, "You must be logged in.");

    // transactionId
    if (! (typeof options.transactionId === "string" && options.transactionId.length))
      throw new Meteor.Error(400, "Transaction ID missing.");

		// update all splits that match
		var transaction = Transactions.findOne(options.transactionId);
		var newSplits = new Array();
		transaction.splits.forEach( function(split) {
			if (split.userId == Meteor.userId())
				split.approved = options.approved;
			newSplits.push(split);
		});

		return Transactions.update(options.transactionId,
			{$set: { splits: newSplits }});
  },
});

function balance_transactionPrepare(options, creatingUserId) {
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
  options.date = balance_parseDate(options.date);

  // description
  if (! (typeof options.description === "string" && options.description.length))
    throw new Meteor.Error(400, "A description is required.");

	// type
	options.type = balance_verifyTransactionType(options.type);

  // splits
  if (! (typeof options.splits === "object"))
    throw new Meteor.Error(400, "Splits must be an object.");

  var splitTotal = 0.00;
  var amount;
  options.total = 0.00;
  var newSplits = new Array();
  options.splits.forEach(function (split) {
    // userId
    if (! (typeof split.userId === "string" && split.userId.length))
      throw new Meteor.Error(400, "Please select who's involved in this transaction.");
    // is user in this group?
    if (!balance_isGroupMember(options.groupId, split.userId))
      throw new Meteor.Error(400, "User is not a member of this group.");
    // amount
    if (! (typeof split.amount === "number"))
      throw new Meteor.Error(400, "Each entry must have an amount.");
    // description
    if (! (typeof split.description === "string"))
      throw new Meteor.Error(400, "Each entry's description must be a string.");
    // approved?
    group.members.forEach( function (member) {
			if (member.userId == split.userId) {
				split.approved =
				  (member.userId == creatingUserId) ||
					((member.approval == 'none') ||
					 (member.approval == 'debits' && split.amount >= 0));
				return;
			}
		});
    // total the splits
    amount = parseFloat(parseFloat(split.amount).toFixed(2));
    splitTotal += amount;
    if (amount > 0) {
		  options.total += amount;
	  }
	  // build the new split array
	  newSplits.push(split);
  });
  options.splits = newSplits;
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

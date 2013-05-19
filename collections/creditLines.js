///////////////////////////////////////////////////////////////////////////////
// Credit lines

/*
  Each credit line is represented by a document in the CreditLines collection:
    creditor: user id
    debtor: user id
    amount: float
*/

CreditLines = new Meteor.Collection("creditLines");

CreditLines.allow({
  insert: function (userId, creditLine) {
	return creditLine.creditor == userId;
  },
  update: function (userId, group, fields, modifier) {
	return creditLine.creditor == userId;
  },
  remove: function (userId, group) {
	return creditLine.creditor == userId;
  }
});

Meteor.methods({
	// options should include: debtor, amount
  extendCredit: function (options) {
    options = options || {};
    if (! (typeof options.debtor === "string" && options.debtor.length))
      throw new Meteor.Error(400, "Required parameter missing - debtor");
    if (! (typeof options.amount === "number"))
      throw new Meteor.Error(400, "Required parameter missing - amount");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

		// cast amount as a float with 2 digits of precision
		var amount = parseFloat(options.amount.toFixed(2));
	
    // does a creditor/debtor record already exist?
    var count = CreditLines.find({creditor: this.userId, debtor: options.debtor});
    if (count.count() == 0) {
			// no, is the amount nonzero?
			if (amount != 0.00) {
				// create a new one
				return CreditLines.insert({
					creditor: this.userId,
					debtor: options.debtor,
					amount: amount,
				});
			}
		} else {
			// is the amount zero?
			if (amount == 0.00) {
				// remove an existing one
				return CreditLines.remove(
					{ creditor: this.userId, debtor: options.debtor }
				);
			} else {
				// update an existing one
				return CreditLines.update(
					{creditor: this.userId, debtor: options.debtor},
					{$set: { amount: amount }}
				);
			}	
		}
  },
});


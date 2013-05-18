// Balance -- data model
// Loaded on both the client and the server

///////////////////////////////////////////////////////////////////////////////
// Groups

/*
  Each group is represented by a document in the Groups collection:
    coordinators: array of user ids
    members: array of user ids
    name: String
	description: String
*/
Groups = new Meteor.Collection("groups");

Groups.allow({
  insert: function (userId, group) {
    return false; // no cowboy inserts -- use createGroup method
  },
  update: function (userId, group, fields, modifier) {
    if (!_.contains(group.coordinators, userId))
      return false; // not a coordinator

    var allowed = ["name","description","members","coordinators"];
    if (_.difference(fields, allowed).length)
      return false; // tried to write to forbidden field

    // A good improvement would be to validate the type of the new
    // value of the field (and if a string, the length.) In the
    // future Meteor will have a schema system to makes that easier.
    return true;
  },
  remove: function (userId, group) {
    return _.contains(group.coordinators, userId);
  }
});

///////////////////////////////////////////////////////////////////////////////
// Users

displayName = function (user) {
  if (user.profile) {
		if (user.profile.nickname)
			return user.profile.nickname;
		if (user.profile.name)
			return user.profile.name;
  }			
  return 'No name';
};

var contactEmail = function (user) {
  if (user.emails && user.emails.length)
    return user.emails[0].address;
  if (user.services && user.services.facebook && user.services.facebook.email)
    return user.services.facebook.email;
  return null;
};

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
  //////////////////////////////////
  // Groups
  
  // options should include: name, description
  createGroup: function (options) {
    options = options || {};
    if (! (typeof options.name === "string" && options.name.length))
      throw new Meteor.Error(400, "Required parameter missing");
    if (options.name.length > 100)
      throw new Meteor.Error(413, "Name too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    return Groups.insert({
      members: [ this.userId ],
      coordinators: [ this.userId ],
      name: options.name,
      description: options.description,
    });
  },
  // options should include: groupId, userId
  joinGroup: function (options) {
	// required parameters?
    options = options || {};
    if (! (typeof options.groupId === "string" && options.groupId.length))
      throw new Meteor.Error(400, "Required parameter missing");
    if (! (typeof options.userId === "string" && options.userId.length))
      throw new Meteor.Error(400, "Required parameter missing");
      
    // is the user already a member?
    var memberCount = Groups.find({_id: options.groupId, members: options.userId});
    if (memberCount.count() > 0)
      throw new Meteor.Error(401, "User already belongs to that group");
    
    return Groups.update(options.groupId, { $push: { members: options.userId } });
  },
  // options should include: groupId, userId
  leaveGroup: function (options) {
	// required parameters?
    options = options || {};
    if (! (typeof options.groupId === "string" && options.groupId.length))
      throw new Meteor.Error(400, "Required parameter missing");
    if (! (typeof options.userId === "string" && options.userId.length))
      throw new Meteor.Error(400, "Required parameter missing");
      
    // is the user already a member?
    var memberCount = Groups.find({_id: options.groupId, members: options.userId});
    if (memberCount.count() != 1)
      throw new Meteor.Error(401, "User doesn't belong to that group");
    
    // are there any transactions with this member?
    var transCount = Transactions.find({
			'splits.userId': options.userId,
			groupId: options.groupId,
		});
		if (transCount.count() > 0)
		  throw new Meteor.Error(401, "Please remove all your transactions first.");
    
    return Groups.update(options.groupId, { $pull: { members: options.userId } });
  },
  
  //////////////////////////////////
  // CreditLimits
  
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
        return CreditLines.insert( {
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
          {creditor: this.userId, debtor: options.debtor}
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
  
  //////////////////////////////////
  // Users
  
  // options should include: name, nickname
  updateProfile: function (options) {
    options = options || {};
    if (! (typeof options.name === "string" && options.name.length))
      throw new Meteor.Error(400, "A name is required.");
    if (options.name.length > 100)
      throw new Meteor.Error(413, "The name must be 100 characters or shorter.");
    if (options.nickname.length > 100)
      throw new Meteor.Error(413, "The nickname must be 100 characters or shorter.");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in to update your profile.");

    return Meteor.users.update(this.userId, 
			{$set: {
				'profile.name': options.name,
				'profile.nickname': options.nickname,
			}});
  },
  
  //////////////////////////////////
  // Transactions
  
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

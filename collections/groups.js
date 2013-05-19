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

Meteor.methods({
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
});

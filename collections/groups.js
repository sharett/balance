///////////////////////////////////////////////////////////////////////////////
// Groups

/*
* .name: String
* .description: String
*	.type (open, visible, invite_only)
* .members: array of user ids
* 	.userId
* 	.coordinator (bool)
* 	.status (active, left, invited, requested, rejected)
*		.approval (all, debits, none)
* 
*/

Groups = new Meteor.Collection("groups");

Meteor.methods({
	// name, description, type
	createGroup: function (options) {
    options = options || {};
    
    // logged in?
    if (!this.userId)
      throw new Meteor.Error(403, "You must be logged in.");
    
    // verify the name
    if (! (typeof options.name === "string" && options.name.length))
      throw new Meteor.Error(400, "A name is required.");
    if (options.name.length > 100)
      throw new Meteor.Error(413, "The maximum length of the name is 100 characters.");
    
    // verify the type
		options.type = balance_verifyGroupType(options.type);

		// create the group
    return Groups.insert({
      name: options.name,
      description: options.description,
      type: options.type,
      members: [ 
				{
					userId: this.userId,
					coordinator: true,
					status: "active",
					approval: "none",
				},
			],
    });
  },
  // groupId, name, description, type
	updateGroup: function (options) {
		options = options || {};

		// logged in?
    if (!this.userId)
      throw new Meteor.Error(403, "You must be logged in.");
    
		// is this user a coordinator?
		if (!balance_isGroupCoordinator(options.groupId, this.userId))
			throw new Meteor.Error(403, "You are not a coordinator for this group.");
		
		// verify name
    if (! (typeof options.name === "string" && options.name.length))
      throw new Meteor.Error(400, "A name is required.");
    if (options.name.length > 100)
      throw new Meteor.Error(413, "The maximum length of the name is 100 characters.");
		
		// verify the group type
		options.type = balance_verifyGroupType(options.type);

		// update the group
    return Groups.update(options.groupId, 
			{$set: {
				name: options.name,
				description: options.description,
				type: options.type,
			}});
  },
  // groupId, approval
	updateApproval: function (options) {
		options = options || {};

		// groupId?
    if (! (typeof options.groupId === "string" && options.groupId.length))
      throw new Meteor.Error(400, "Required parameter missing");

		// logged in?
    if (!this.userId)
      throw new Meteor.Error(403, "You must be logged in.");
    
		// is this user a member?
		if (!balance_isGroupMember(options.groupId, this.userId))
			throw new Meteor.Error(403, "You are not a member of this group.");
		
		// verify the approval type
		options.approval = balance_verifyApprovalType(options.approval);

		// update the group
    return balance_updateGroupMember(options.groupId, 
			{ userId: this.userId, approval: options.approval });
  },
  // groupId, userId, status
	updateStatus: function (options) {
		options = options || {};

		// groupId & userId?
    if (! (typeof options.groupId === "string" && options.groupId.length))
      throw new Meteor.Error(400, "Required parameter missing");
    if (! (typeof options.userId === "string" && options.userId.length))
      throw new Meteor.Error(400, "Required parameter missing");

		// logged in?
    if (!this.userId)
      throw new Meteor.Error(403, "You must be logged in.");
    
		// is this user a coordinator?
		if (!balance_isGroupCoordinator(options.groupId, this.userId))
			throw new Meteor.Error(403, "You are not a coordinator of this group.");
		
    // what is the member's balance in this group?
    var balance = balance_GetUserBalance(options.userId, options.groupId);
    if (balance != 0)
			throw new Meteor.Error(401, 
			  "Members must have a zero balance in order to change the status.");
			
    // are there any unapproved transactions with this member?
    var transCount = Transactions.find({
			'splits.userId': options.userId,
			'splits.approved': false,
			groupId: options.groupId,
		});
		if (transCount.count() > 0)
		  throw new Meteor.Error(401, 
				"All transactions involving this member must be approved (or removed) "+
				"in order to change the status.");

		// verify the approval type
		options.status = balance_verifyStatusType(options.status);

		// send e-mails if appropriate
		var user = Meteor.users.findOne(options.userId);
		var group = Groups.findOne(options.groupId);
		var groupName = "\"" + group.name + "\"";
		switch (options.status) {
			case 'invited':				
				balance_sendEmail(
					"Invitation to join the group " + groupName,
					user,
					"Dear " + balance_fullName(user) + ",\n\n" +
					balance_fullName(Meteor.user()) + " has invited you to join the group " +
						groupName + ".  Log in to accept this invitation.\n\n" +
						"Thanks,\n" +
						Meteor.absoluteUrl() + "\n\n"
				);
				break;
			case 'rejected':
				balance_sendEmail(
					"Banned from the group " + groupName,
					user,
					"Dear " + balance_fullName(user) + ",\n\n" +
					balance_fullName(Meteor.user()) + " has banned you from the group " +
						groupName + ".\n\n" +
						"Thanks,\n" +
						Meteor.absoluteUrl() + "\n\n"
				);
				break;
			case 'active':
				balance_sendEmail(
					"You've joined the group " + groupName,
					user,
					"Dear " + balance_fullName(user) + ",\n\n" +
					balance_fullName(Meteor.user()) + " has made you an active member of the group " +
						groupName + ".  Log in to begin participating in this group.\n\n" +
						"Thanks,\n" +
						Meteor.absoluteUrl() + "\n\n"
				);
				break;
			case 'left':
			  balance_sendEmail(
					"You've left the group " + groupName,
					user,
					"Dear " + balance_fullName(user) + ",\n\n" +
					balance_fullName(Meteor.user()) + " has marked you as an inactive member in the group " +
						groupName + ".  You can rejoin anytime by logging in.\n\n" +
						"Thanks,\n" +
						Meteor.absoluteUrl() + "\n\n"
				);
				break;
			default:
				break;
		}

		// update the group
    return balance_updateGroupMember(options.groupId, 
			{ userId: options.userId, status: options.status });
  },
  // groupId
	removeGroup: function (options) {
		options = options || {};

		// logged in?
    if (!this.userId)
      throw new Meteor.Error(403, "You must be logged in.");
    
		// is this user a coordinator?
		if (!balance_isGroupCoordinator(options.groupId, this.userId))
			throw new Meteor.Error(403, "You are not a coordinator for this group.");
		
		// make sure there are no transactions
		if (Transactions.find({groupId: options.groupId}).count())
			throw new Meteor.Error(403, "Please remove all transactions before removing this group.");
		
		// remove the group
    return Groups.remove(options.groupId);
  },
  // options should include: groupId, userId
  joinGroup: function (options) {
		options = options || {};
    
    // logged in?
    if (!this.userId)
      throw new Meteor.Error(403, "You must be logged in.");
    
    // required parameters?
    if (! (typeof options.groupId === "string" && options.groupId.length))
      throw new Meteor.Error(400, "Required parameter missing");
      
    // is the user already a member?
    var member = balance_getGroupMember(options.groupId, this.userId);
    if (member) {
			switch (member.status) {
				case 'active':
					throw new Meteor.Error(401, "You are already a member of this group.");
					break;
				case 'left':
			  	// those who've left may rejoin without another invitation
				  return balance_updateGroupMember(options.groupId, { userId: this.userId, status: "active" });
				case 'invited':
					// user is accepting invitation
					return balance_updateGroupMember(options.groupId, { userId: this.userId, status: "active" });
				case 'requested':
					throw new Meteor.Error(401, "You've already requested to join this group.");
					break;
				case 'rejected':
				default:
					throw new Meteor.Error(401, "You are not allowed to join this group.");
					break;
			}			
		}
		
		var newStatus = 'active';
		
		// does this group require an invitation?
		var group = Groups.findOne(options.groupId);
		if (group.type == 'visible') {
			// send a request for approval to the group coordinator(s)
			newStatus = 'requested';
			group.members.forEach( function(member) {
				if (!member.coordinator)
					return;
				
				var user = Meteor.users.findOne(member.userId);
				var groupName = "\"" + group.name + "\"";
				balance_sendEmail(
					"Request to join group " + group.name,
					user,
					"Hi group coordinators,\n\n" +
						balance_fullName(Meteor.user()) + " has requested to join your group " +
						groupName + ".  Please log in and approve or reject this request.\n\n" +
						"Thanks,\n" +
						Meteor.absoluteUrl() + "\n\n"
				);
			});
		} else if (group.type != 'open') {
			throw new Meteor.Error(400, "This is an invite-only group.");
		}
    
    return Groups.update(options.groupId, 
			{ $push: 
				{ members: {
					  userId: this.userId,
					  coordinator: false,
					  status: newStatus,
					  approval: "none",
				  }
				} 
			});
  },
  // options should include: groupId, userId
  leaveGroup: function (options) {
		options = options || {};
    
    // logged in?
    if (!this.userId)
      throw new Meteor.Error(403, "You must be logged in.");
    
    // required parameters?
    if (! (typeof options.groupId === "string" && options.groupId.length))
      throw new Meteor.Error(400, "Required parameter missing");
      
    // is the user already a member?
    var memberCount = Groups.find({_id: options.groupId, "members.userId": this.userId});
    if (memberCount.count() != 1)
      throw new Meteor.Error(401, "User doesn't belong to that group");
    
    // what is the member's balance in this group?
    var balance = balance_GetUserBalance(this.userId, options.groupId);
    if (balance != 0)
			throw new Meteor.Error(401, "You must have a zero balance in order to leave a group.");
			
    // are there any unapproved transactions with this member?
    var transCount = Transactions.find({
			'splits.userId': this.userId,
			'splits.approved': false,
			groupId: options.groupId,
		});
		if (transCount.count() > 0)
		  throw new Meteor.Error(401, 
				"All transactions involving you must be approved (or removed) before leaving a group.");
    
    // remove the member by changing the status to "left"
    return balance_updateGroupMember(options.groupId, { userId: this.userId, status: "left" });
  },
});

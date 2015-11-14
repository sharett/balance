///////////////////////////////////////////////////////////////////////////////
// Groups

// Groups methods that only run on the server

Meteor.methods({
	// options should include:
  fixDates: function (options) {
    options = options || {};

		// logged in?
    if (!this.userId)
      throw new Meteor.Error(403, "You must be logged in.");

    var user = Meteor.users.findOne(this.userId);
    if (user.emails[0].address != Balance.adminEmail)
			throw new Meteor.Error(403, "Not authorized.");

    var transactions = Transactions.find({});
    transactions.forEach( function(transaction) {
			var date = new Date(transaction.date);
			if (date.getFullYear() < 1970)
				date.setFullYear(date.getFullYear() + 100);

			Transactions.update(transaction._id,
				{$set: {date: date}});
		});
  },
  eraseGroups: function (options) {
		options = options || {};

		// logged in?
    if (!this.userId)
      throw new Meteor.Error(403, "You must be logged in.");

    var user = Meteor.users.findOne(this.userId);
    if (user.emails[0].address != Balance.adminEmail)
			throw new Meteor.Error(403, "Not authorized.");

    // remove the transactions, groups and credit limits, but leave users
		Transactions.remove({});
		Groups.remove({});
		CreditLines.remove({});

		return true;
  },
  // options should include: groupId, name, email
  inviteGroup: function (options) {
		options = options || {};

    // logged in?
    if (!this.userId)
      throw new Meteor.Error(403, "You must be logged in.");

    // required parameters?
    check(options.groupId, String);
    check(options.name, String);
    check(options.email, String);
    check(options.message, String);

    if (!options.groupId.length || !options.name.length || !options.email.length)
      throw new Meteor.Error(400, "Required parameter missing");

    // is this user a coordinator?
		if (!balance_isGroupCoordinator(options.groupId, this.userId))
			throw new Meteor.Error(403, "You must be a coordinator of this group to invite people.");

		// is the user already a member?
		var members = balance_GetGroupMembers(options.groupId);
		if (!members)
			throw new Meteor.Error(403, "GroupId is invalid.");
		members.forEach( function(member) {
			if (member.emails) {
				member.emails.forEach( function(email) {
					if (email.address == options.email)
						throw new Meteor.Error(403, "That user is already a member of this group.");
				});
			}
		});

		// is the e-mail already registered with Balance?
		var user = Meteor.users.findOne({ "emails.address": options.email });
		if (!user) {
			// create the user account
			var userId = Accounts.createUser(
				{ email: options.email, profile: { name: options.name } });
			if (!userId)
				throw new Meteor.Error(403, "Creating a new user failed.");
			// send an enrollment e-mail
			Accounts.emailTemplates.enrollAccount.subject = function (user) {
					return "Invitation to use " + Accounts.emailTemplates.siteName;
			};
			Accounts.emailTemplates.enrollAccount.text = function (user, url) {
				 return "Hi " + balance_fullName(user) + ",\n\n" +
				   balance_fullName(Meteor.user()) + " has created an account for you " +
				   "on " + Accounts.emailTemplates.siteName +
				   ".  " + Accounts.emailTemplates.siteName +
				   " is a tool to keep track of shared finances for " +
				   "groups.\n\n" +
				   (options.message ? ("Personal message:\n" + options.message + "\n\n") : "") +
					 "To activate your account, simply click the link below:\n\n" +
					 url + "\n\n" +
					 Accounts.emailTemplates.signature;
			};
			Accounts.sendEnrollmentEmail(userId);
			// load the new user
			user = Meteor.users.findOne(userId);
		}

		// add this user to this group
		Groups.update(options.groupId,
			{ $push:
				{ members: {
						userId: user._id,
						coordinator: false,
						status: 'invited',
						approval: "none",
					}
				}
			});

		// send the invite e-mail
		var group = Groups.findOne(options.groupId);
		var groupName = "\"" + group.name + "\"";
		balance_sendEmail(
			"Invitation to join the group " + groupName,
			user,
			"Dear " + balance_fullName(user) + ",\n\n" +
			balance_fullName(Meteor.user()) + " has invited you to join the group " +
				groupName + ".  Log in to accept this invitation.\n\n" +
				(options.message ? ("Personal message:\n" + options.message + "\n\n") : "") +
				"Thanks,\n" +
				Meteor.absoluteUrl() + "\n\n"
		);
  },
});

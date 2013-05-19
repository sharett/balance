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

Meteor.methods({
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
});

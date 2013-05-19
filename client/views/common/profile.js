///////////////////////////////////////////////////////////////////////////////
// Edit profile dialog

openProfileDialog = function () {
  // does the profile already exist?
  if (typeof Meteor.user().profile == "object") {
		Template.editProfile.full_name = Meteor.user().profile.name;
		Template.editProfile.nickname = Meteor.user().profile.nickname;
  } else {
		Template.editProfile.full_name = '';
		Template.editProfile.nickname = '';
	}
  Session.set("profileError", null);
  Session.set("showProfileDialog", true);
};

Template.dialogs.showProfileDialog = function () {
  return Session.get("showProfileDialog");
};

Template.editProfile.events({
  'click .save': function (event, template) {
    var full_name = template.find(".full_name").value;
    var nickname = template.find(".nickname").value;
    
    if (full_name.length) {
      Meteor.call('updateProfile', {
        name: full_name,
        nickname: nickname,
      }, function (error, profile) {
				if (error) {
					Session.set("profileError", error.reason);
				} else {
					Session.set("showProfileDialog", false);
				}
      });
    } else {
      Session.set("profileError",
                  "A name is required.");
    }
  },

  'click .cancel': function () {
    Session.set("showProfileDialog", false);
  }
});

Template.editProfile.error = function () {
  return Session.get("profileError");
};


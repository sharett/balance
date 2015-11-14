///////////////////////////////////////////////////////////////////////////////
// Edit profile dialog

openProfileDialog = function () {
  Session.set("profileError", null);
  Modal.show('editProfile');
};

Template.editProfile.helpers({
  'full_name': function() {
    return (typeof Meteor.user().profile == "object") ? Meteor.user().profile.name : '';
  },
  'nickname': function() {
    return (typeof Meteor.user().profile == "object") ? Meteor.user().profile.nickname : '';
  },
  'error': function() {
    return Session.get("profileError");
  },
});

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
					Modal.hide('editProfile');
				}
      });
    } else {
      Session.set("profileError",
                  "A name is required.");
    }
  },

  'click .cancel': function () {
    Modal.hide('editProfile');
  }
});

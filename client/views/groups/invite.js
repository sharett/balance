///////////////////////////////////////////////////////////////////////////////
// inviteGroup dialog

openInviteGroupDialog = function () {
  Session.set("inviteGroupError", null);

  Modal.show('inviteGroup');
};

Template.inviteGroup.helpers({
  'error': function () {
    return Session.get("inviteGroupError");
  },
});

Template.inviteGroup.events({
  'click .invite': function (event, template) {
		var groupId = Session.get("selected_group");

		var name = template.find(".invite_name").value;
		var email = template.find(".invite_email").value;
		var message = template.find(".invite_msg").value;

		if (!name.length) {
			Session.set("inviteGroupError", "A name is required.");
			return;
		}

		if (!email.length) {
			Session.set("inviteGroupError", "An e-mail is required.");
			return;
		}

		// invite user to group
		Meteor.call('inviteGroup', {
			groupId: groupId,
			name: name,
			email: email,
			message: message,
		}, function (error, group) {
			if (error) {
				Session.set("inviteGroupError", error.reason);
			} else {
				Modal.hide("inviteGroup");
			}
		});
	},

  'click .cancel': function () {
    Modal.hide("inviteGroup");
  }
});

Template.inviteGroup.error = function () {
  return Session.get("inviteGroupError");
};

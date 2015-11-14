///////////////////////////////////////////////////////////////////////////////
// editGroup dialog

openEditGroupDialog = function (create) {
  Session.set("editGroupType", create ? 'create' : 'update');
  Session.set("editGroupError", null);
  Session.set("editGroupTypeOption", 'visible');

  Modal.show('editGroup');
};

Template.editGroup.helpers({
  'group': function() {
    if (Session.get("editGroupType") == 'create')
      return null;
    var groupId = Session.get("selected_group");
    if (!groupId)
      return null;
    var group = Groups.findOne(groupId);
    if (group) {
      Session.set("editGroupTypeOption", group.type);
    }
    return group;
  },
  'group_type_options': function() {
    return [
      { option: "open", description: "open: anyone may join" },
      { option: "visible", description: "visible: permission needed to join" },
      { option: "invite_only", description: "invite only: not visible unless invited" },
    ];
  },
  'error': function () {
    return Session.get("editGroupError");
  },
  'create': function () { return Session.get('editGroupType') == 'create'; },
});

Template.editGroup.events({
  'click .save': function (event, template) {
		var groupId = Session.get("selected_group");

		var name = template.find(".group_name").value;
		var description = template.find(".description").value;
		var type = template.find(".group_type").value;

		if (name.length) {
			if (Session.get("editGroupType") == 'create') {
				// create a new group
				Meteor.call('createGroup', {
					name: name,
					description: description,
					type: type,
				}, function (error, group) {
					if (error) {
						alert(error.reason);
					} else {
						Session.set("selected_group", group);
						Session.set("selected_member", null);
						// resubscribe to transactions when group membership changes
						Meteor.subscribe("transactions");
					}
				});
			} else {
				// update an existing group
				Meteor.call('updateGroup', {
					groupId: groupId,
					name: name,
					description: description,
					type: type,
				}, function (error, group) {
					if (error) {
						alert(error.reason);
					} else {
						// resubscribe to transactions when group membership changes
						Meteor.subscribe("transactions");
					}
				});
			}

      Modal.hide('editGroup');
		} else {
			Session.set("editGroupError",
									"A name is required.");
		}
	},

  'click .cancel': function () {
    Modal.hide('editGroup');
  },

  'click .remove': function () {
    var group = Groups.findOne(Session.get("selected_group"));
    group.members.forEach(function (member) {
      if (member.userId == Meteor.userId() && member.coordinator) {
        group.is_coordinator = true;
        return;
      }
    });

    if (group.is_coordinator) {
      if (confirm('Are you sure you want to remove this group?')) {
        Meteor.call('removeGroup', {
          groupId: group._id,
        }, function (error, group) {
          if (error) {
            alert(error.reason);
          } else {
            Modal.hide('editGroup');
            Session.set("selected_group", null);
            Session.set("selected_member", null);
            // resubscribe to transactions when group membership changes
            Meteor.subscribe("transactions");
          }
        });
      }
    } else {
      alert('Only the group coordinator can remove this group.');
    }
  },
});

Template.editGroupTypeOption.helpers({
  'selected': function () {
    return this.option == Session.get("editGroupTypeOption");
  }
});

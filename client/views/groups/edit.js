///////////////////////////////////////////////////////////////////////////////
// editGroup dialog

openEditGroupDialog = function (create) {
  if (!create) {
		// is there a selected group?
		var groupId = Session.get("selected_group");
		if (!groupId)
			return;
		var group = Groups.findOne(groupId);
    Template.editGroup.group_name = group.name;
    Template.editGroup.description = group.description;
    Template.editGroup.create = false;
  } else {
    Template.editGroup.create = true;
  }

  Session.set("editGroupError", null);
  Session.set("showEditGroupDialog", create ? 'create' : 'update');
};

Template.dialogs.showEditGroupDialog = function () {
  return Session.get("showEditGroupDialog");
};

Template.editGroup.events({
  'click .save': function (event, template) {
		var groupId = Session.get("selected_group");
		
		var name = template.find(".group_name").value;
		var description = template.find(".description").value;
		
		if (name.length) {
			if (Session.get("showEditGroupDialog") == 'create') {
				// create a new group
				Meteor.call('createGroup', {
					name: name,
					description: description,
				}, function (error, group) {
					if (! error) {
						Session.set("selected_group", group);
						Session.set("selected_member", null);
						// resubscribe to transactions when group membership changes
						Meteor.subscribe("transactions");
					}
				});
			} else {
				// update an existing group
				Groups.update(groupId, {$set: {'name': name, 'description': description } });
			}
			
			Session.set("showEditGroupDialog", false);
		} else {
			Session.set("editGroupError",
									"A name is required.");
		}
	},

  'click .cancel': function () {
    Session.set("showEditGroupDialog", false);
  }
});

Template.editGroup.error = function () {
  return Session.get("editGroupError");
};


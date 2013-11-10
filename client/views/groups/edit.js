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
    Template.editGroup.type = group.type;
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

Template.editGroup.group_type_options = function () {
	return [
		{ option: "open", description: "open: anyone may join" }, 
		{ option: "visible", description: "visible: permission needed to join" }, 
		{ option: "invite_only", description: "invite only: not visible unless invited" },
	];
};

Template.editGroup.events({
  'click .save': function (event, template) {
		var groupId = Session.get("selected_group");
		
		var name = template.find(".group_name").value;
		var description = template.find(".description").value;
		var type = template.find(".group_type").value;
		
		if (name.length) {
			if (Session.get("showEditGroupDialog") == 'create') {
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

Template.editGroupTypeOption.selected = function () {
  return this.option == Template.editGroup.type;
};



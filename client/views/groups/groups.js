///////////////////////////////////////////////////////////////////////////////
// Groups

// Groups that this user is a member of
Template.groups.groups = function () {
  return Groups.find({ members: Meteor.userId() });
};

// Groups that this user is not a member of
Template.groups.other_groups = function () {
  return Groups.find({ members: { $ne: Meteor.userId() } });
};

Template.main.selected_group = function() {
  return Session.get("selected_group");
};

Template.groups.selected_group = function() {
  return Session.get("selected_group");
};

Template.groups.group = function () {
  var group = Groups.findOne(Session.get("selected_group"));
  if (!group) {
	  return null;
  }
  var member_list = Meteor.users.find({_id: {$in: group.members}});
  group.member_list = new Array();
  member_list.forEach(function (member) {
    member.is_coordinator = _.contains(group.coordinators, member._id);
		member.me = (member._id == Meteor.userId());
		group.member_list.push(member);
  });
  group.is_member = _.contains(group.members, Meteor.userId());
  group.is_coordinator = _.contains(group.coordinators, Meteor.userId());
  
  return group;
};

Template.groups.events({
  'click .creategroup': function () {
    if (! Meteor.userId()) // must be logged in to create groups
      return;
    openEditGroupDialog(true);  
  },
});

Template.group.selected = function () {
  return Session.equals("selected_group", this._id) ? "selected" : '';
};

Template.group.events({
  'click': function () {
    Session.set("selected_group", this._id);
    Session.set("selected_member", null);
  },
});

Template.group_detail.events({
  'click .editgroup': function () {
	if (this.is_coordinator) {
      openEditGroupDialog(false);
    } else {
	  alert('Only the group coordinator can edit this group.');
    }
  },
  'click .removegroup': function () {
    if (this.is_coordinator) {
			if (confirm('Are you sure you want to remove this group?')) {
				Groups.remove(this._id);
				Session.set("selected_group", null);
				Session.set("selected_member", null);
				// resubscribe to transactions when group membership changes
				Meteor.subscribe("transactions");
			}
		} else {
			alert('Only the group coordinator can remove this group.');
    }
  },
  'click .joingroup': function () {
	// is the user not a member of this group?
    if (!this.is_member) {
	  Meteor.call('joinGroup', {
			groupId: this._id,
			userId: Meteor.userId(),
		}, function (error, group) {
			if (!error) {
				// resubscribe to transactions when group membership changes
				Meteor.subscribe("transactions");
			}
		});
	}
  },
  'click .leavegroup': function () {
		// is the user a member of this group?
    if (this.is_member) {
			if (confirm('Are you sure you want to leave this group?')) {
				Meteor.call('leaveGroup', {
					groupId: this._id,
					userId: Meteor.userId(),
				}, function (error, group) {
					if (error) {
						alert(error.reason);
					} else {
						// resubscribe to transactions when group membership changes
						Meteor.subscribe("transactions");
					}
				});
			}
		}
  },
});


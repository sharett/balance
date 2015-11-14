///////////////////////////////////////////////////////////////////////////////
// Groups

Template.groups.helpers({
	'groups': function () {
		// Groups that this user is a member of
		var groups = Groups.find({ "members.userId": Meteor.userId() }, { sort: { name: 1 } });

		var groupList = new Array();
		groups.forEach( function (group) {
			group.members.forEach( function (member) {
				if (member.userId == Meteor.userId() && member.status == 'active') {
					groupList.push(group);
					return;
				}
			});
		});

		return groupList;
	},
	'invited_groups': function() {
		// Groups that this user has been invited to
		var groups = Groups.find({}, { sort: { name: 1 } });

		var groupList = new Array();
		groups.forEach( function (group) {
			var display = false;
			if (group.members) {
				group.members.forEach( function (member) {
					if (member.userId == Meteor.userId()) {
						if (member.status == 'invited' || member.status == 'left')
							display = true;
						if (member.status == 'invited')
							group.is_invited = true;
					}
				});
			}

			if (display)
				groupList.push(group);
		});

		return groupList;
	},
	'selected_group': function() {
		return Session.get("selected_group");
	},
	'group': function () {
	  var group = Groups.findOne(Session.get("selected_group"));
	  if (!group) {
		  return null;
	  }

	  // group type
	  group.type_open = group.type == 'open';
	  group.type_visible = group.type == 'visible';
	  group.can_join = true;
	  group.is_coordinator = false;
	  if (group.type == 'invite_only')
			group.type = 'invite only';

		// group description
		if (group.description.length > 60) {
			group.short_desc = group.description.substr(0, 60);
		}

		// group members
	  group.member_list = new Array();

	  if (group.members) {
			// determine if we are a coordinator
			group.members.forEach(function (member) {
				if (member.userId == Meteor.userId() && member.coordinator) {
					group.is_coordinator = true;
					return;
				}
			});

			group.members.forEach(function (member) {
				// look up the user data for each member
				var user = Meteor.users.findOne(member.userId);
				if (user) {
					member.profile = user.profile;
				}
				member._id = member.userId;
				member.me = (member._id == Meteor.userId());
				member.active = (member.status == 'active');

				if (member.me) {
					if (member.status == 'active') {
						group.is_member = true;
					} else {
						group.can_join = false;
						group.has_left = (member.status == 'left');
						group.is_invited = (member.status == 'invited');
						group.is_requested = (member.status == 'requested');
						group.is_rejected = (member.status == 'rejected');
					}
				}

				if (member.status == 'active' || group.is_coordinator)
					group.member_list.push(member);
			});

			// sort the members by nickname
			group.member_list.sort(function (a, b) {
				if (displayName(a) > displayName(b)) {
					return 1;
				} else if (displayName(a) < displayName(b)) {
					return -1;
				} else {
					return 0;
				}
			});
		}

		return group;
	},
	'display_group_listing': function () {
		return Session.get("display_group_listing");
	},
});

Template.groups.events({
  'click .creategroup': function () {
    if (!Meteor.userId()) // must be logged in to create groups
      return;
    openEditGroupDialog(true);
  },
	'click .displaygrouplisting': function () {
		Session.set("selected_group", null);
		Session.set("display_group_listing", true);
	},
});

////////////////////////////////////////////////////////////////////////////////

Template.balancegroup.helpers({
	'selected': function () {
		return Session.equals("selected_group", this._id) ? "selected" : '';
	},
})

Template.balancegroup.events({
  'click': function () {
    Session.set("selected_group", this._id);
    Session.set("selected_member", null);
 		Session.set("selected_transaction", null);
 		Session.set("transaction_error", null);
 		Session.set("transaction_filter_query", '');
 		Session.set("transaction_filter_month", null);
 		Session.set("transaction_filter_member", null);
		Session.set("group_description_show_more", false);
  },
});

////////////////////////////////////////////////////////////////////////////////

Template.group_detail.helpers({
	'group_description_show_more': function() {
		return Session.get("group_description_show_more");
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
  'click .invitegroup': function () {
		if (this.is_coordinator) {
			openInviteGroupDialog();
		} else {
			alert('Only the group coordinator can invite people to groups.');
		}
  },
  'click .removegroup': function () {
    if (this.is_coordinator) {
			if (confirm('Are you sure you want to remove this group?')) {
				Meteor.call('removeGroup', {
					groupId: this._id,
				}, function (error, group) {
					if (error) {
						alert(error.reason);
					} else {
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
  'click .joingroup': function () {
		// is the user not a member of this group?
		if (!this.is_member) {
			Meteor.call('joinGroup', {
				groupId: this._id,
				userId: Meteor.userId(),
			}, function (error, group) {
				if (error) {
					alert(error.reason);
				} else {
				  // set us as the currently selected member
				  Session.set("selected_member", Meteor.userId());
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
	'click .toggledescription': function() {
		Session.set("group_description_show_more", !Session.get("group_description_show_more"));
	},
});

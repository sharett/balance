///////////////////////////////////////////////////////////////////////////////
// Group listing

Template.grouplisting.helpers({
  'groups': function() {
    // all groups that this user is a member of, has been invited to, or can view
    var groups = Groups.find({}, { sort: { name: 1 } });

    var groupList = new Array();
    groups.forEach( function (group) {
      var display = true;
      group.member_status = '';
      if (group.members) {
        group.members.forEach( function (member) {
          if (member.userId == Meteor.userId()) {
            group.member_status = member.status;
            if (group.type == 'invite_only' && member.status != 'active' &&
                member.status != 'invited' && member.status != 'left')
              display = false;
            if (member.status == 'invited')
              group.is_invited = true;
          }
        });
      } else {
        if (group.type == 'invite_only')
          display = false;
      }

      if (group.type == 'invite_only') {
        group.type = 'invite only';
      }
      
      if (display)
        groupList.push(group);
    });

    return groupList;
  },
});

Template.grouplisting_detail.events({
  'click': function () {
    Session.set("selected_group", this._id);
    Session.set("display_group_listing", false);
  },
});

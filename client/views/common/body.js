///////////////////////////////////////////////////////////////////////////////
// Navbar

Template.navbar.events({
  'click .go-home': function () {
    Session.set("selected_group", null);
  },
});


Template.navbar.events({
  'click .editprofile': function () {
    if (! Meteor.userId()) // must be logged in
      return;
    openProfileDialog();
  }
});	

///////////////////////////////////////////////////////////////////////////////
// Main

Template.main.selected_member = function() {
  return Session.get("selected_member");
};

Template.main.is_user_member_of_selected_group = function() {
	// is the current user a member of the selected group?
  var group = Groups.findOne(Session.get("selected_group"));
  if (!group) {
	  return false;
  }

  return _.contains(group.members, Meteor.userId());
};

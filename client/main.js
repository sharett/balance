Meteor.autorun(function() {
  if (Meteor.user()) {
    // the user has just logged in - clear the session variables, resubscribe
    //Session.set("selected_group", null);
    Session.set("selected_member", null);
    Session.set("selected_transaction", null);
    Session.set("showEditGroupDialog", false);
    Session.set("showTransactionDialog", false);
    Session.set("showInviteGroupDialog", false);
    
    // if a name hasn't been set, show the profile dialog
    if (typeof Meteor.user().profile == "object" &&
				Meteor.user().profile.name) {
			Session.set("showProfileDialog", false);
		} else {
			openProfileDialog();
		}
		
    Meteor.subscribe("directory");
		Meteor.subscribe("myGroups");
		Meteor.subscribe("otherGroups");
		Meteor.subscribe("creditLines");
		Meteor.subscribe("transactions");
  }
});

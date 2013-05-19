Meteor.autorun(function() {
  if (Meteor.user()) {
    // the user has just logged in - clear the session variables, resubscribe
    Session.set("selected_group", null);
    Session.set("selected_member", null);
    Session.set("selected_transaction", null);
    Session.set("showEditGroupDialog", false);
    Session.set("showTransactionDialog", false);
    Session.set("showProfileDialog", false);
    
    Meteor.subscribe("directory");
		Meteor.subscribe("groups");
		Meteor.subscribe("creditLines");
		Meteor.subscribe("transactions");
  }
});

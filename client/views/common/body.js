///////////////////////////////////////////////////////////////////////////////
// Navbar

Template.navbar.helpers({
	'adminUser': function() {
		return (Meteor.user() && Meteor.user().emails[0].address == Balance.adminEmail);
	}
});

Template.navbar.events({
  'click .go-home': function () {
    Session.set("selected_group", null);
    Session.set("display_faq", false);
		Session.set("display_group_listing", false);
  },
  'click .go-faq': function () {
    Session.set("selected_group", null);
    Session.set("display_faq", true);
		Session.set("display_group_listing", false);
  },
  'click .editprofile': function (event, template) {
    if (!Meteor.userId()) // must be logged in
      return;
    openProfileDialog();
  },
  'click .adminmenu': function () {
    if (!Meteor.userId()) // must be logged in
      return;
    if (Meteor.user().emails[0].address != Balance.adminEmail)
			return;

		alert("Nothing to do.");

		/*if (confirm("Are you sure you want to fix the dates?")) {
			Meteor.call('fixDates', {
				}, function (error) {
					if (error) {
						alert(error.reason);
					} else {

					}
			});
		}*/
  },
});

///////////////////////////////////////////////////////////////////////////////
// Main

Template.main.helpers({
	'selected_member': function() {
		return Session.get("selected_member");
	},
	'is_user_member_of_selected_group': function() {
		var member = balance_getGroupMember(Session.get("selected_group"), Meteor.userId());
		if (!member)
			return false;

		return member.status == 'active';
	},
	'display_faq': function() {
		return Session.get("display_faq");
	},
	'display_group_listing': function () {
		return Session.get("display_group_listing");
	},
});

///////////////////////////////////////////////////////////////////////////////
// Home

Template.home.events({
  'click .learn-more': function () {
    Session.set("selected_group", null);
    Session.set("display_faq", true);
		Session.set("display_group_listing", false);
  },
});

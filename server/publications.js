Meteor.publish("directory", function () {
  return Meteor.users.find({}, {fields: {profile: 1}});
});

Meteor.publish("myGroups", function () {
  return Groups.find({ "members.userId": this.userId });
});

Meteor.publish("otherGroups", function () {
  return Groups.find(
		{ "members.userId": { $ne: this.userId } },
		{ fields: { name: 1, description: 1, type: 1 } });
});

Meteor.publish("creditLines", function () {
  return CreditLines.find({$or: [{ creditor: this.userId }, { debtor: this.userId }] });
});

Meteor.publish("transactions", function () {
  var groups = Groups.find({ "members.userId": this.userId, "members.status": "active" }, { _id: 1 });
  groupIds = new Array();
  groups.forEach(function (group) {
    groupIds.push(group._id);
  });

  return Transactions.find({ groupId: { $in: groupIds }});
});

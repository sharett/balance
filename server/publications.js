Meteor.publish("directory", function () {
  return Meteor.users.find({}, {fields: {profile: 1}});
});

Meteor.publish("groups", function () {
  return Groups.find({});  //{ members: this.userId }
});

Meteor.publish("creditLines", function () {
  return CreditLines.find({$or: [{ creditor: this.userId }, { debtor: this.userId }] });
});

Meteor.publish("transactions", function () {
  var groups = Groups.find({ members: this.userId }, { _id: 1 });
  groupIds = new Array();
  groups.forEach(function (group) {
    groupIds.push(group._id);
  });
  
  return Transactions.find({ groupId: { $in: groupIds }});
});

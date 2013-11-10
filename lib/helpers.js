balance_verifyTransactionType = function (type) {
  var types = new Array("payment", "charge", "reimbursement", "other");
	if (_.contains(types, type)) {
		return type;
	} else {
		return "other";
	}
};

balance_verifyGroupType = function (type) {
  var types = new Array("open", "visible", "invite_only");
	if (_.contains(types, type)) {
		return type;
	} else {
		return "invite_only";
	}
};

balance_verifyApprovalType = function (type) {
  var types = new Array("all", "debits", "none");
	if (_.contains(types, type)) {
		return type;
	} else {
		return "all";
	}
};

balance_verifyStatusType = function (type) {
  var types = new Array("active", "left", "invited", "requested", "rejected");
	if (_.contains(types, type)) {
		return type;
	} else {
		return "active";
	}
};

balance_isGroupCoordinator = function (groupId, userId) {
	return Groups.find({ _id: groupId, members: { 
		$elemMatch: { userId: userId, coordinator: true }}}).count() > 0;
};

balance_getGroupMember = function(groupId, userId) {
	var group = Groups.findOne({_id: groupId, "members.userId": userId});
	if (!group)
		return null;
	
	var memberMatch;
	group.members.forEach( function (member) {
		if (member.userId == userId) {
			member._id = member.userId;
			var user = Meteor.users.findOne(member.userId);
			if (user && user.profile) 
				member.profile = user.profile;
			memberMatch = member;
			return;
		}
	});
	
	return memberMatch;
};

balance_GetGroupMembers = function(groupId) {
	// load the names of the users in this group
	var group = Groups.findOne(groupId);
	if (!group)
		return null;
	
	var memberList = new Array();
	group.members.forEach( function (member) {
		var user = Meteor.users.findOne(member.userId);
		member._id = member.userId;
		member.displayName = displayName(user);
		if (user && user.profile) 
			member.profile = user.profile;
		if (user && user.emails)
			member.emails = user.emails;
		memberList.push(member);
	});
	
	// sort the members by nickname
  memberList.sort(function (a, b) {
		if (displayName(a) > displayName(b)) {
			return 1;
		} else if (displayName(a) < displayName(b)) {
			return -1;
		} else {
			return 0;
		}
	});
	
	return memberList;
};

balance_splitsMembersCurrent = function(transaction) {
	var membersCurrent = true;
	transaction.splits.forEach( function(split) {
		var member = balance_getGroupMember(transaction.groupId, split.userId);
		if (!member || member.status != 'active')
			membersCurrent = false;
			return;
	});
	return membersCurrent;
}

balance_isGroupMember = function (groupId, userId) {
	return Groups.find({_id: groupId, "members.userId": userId}).count() > 0;
};

balance_updateGroupMember = function (groupId, newMember) {
	var group = Groups.findOne(groupId);
	if (!group)
		return false;
		
	var memberList = new Array();
	group.members.forEach(function (member) {
		if (newMember.userId == member.userId) {
			if (typeof newMember.coordinator != "undefined")
				member.coordinator = newMember.coordinator;
			if (typeof newMember.status != "undefined")
				member.status = newMember.status;
			if (typeof newMember.approval != "undefined")
				member.approval = newMember.approval;
		}
		memberList.push(member);
	});
	
	return Groups.update(groupId, { $set: { members: memberList } });
};

balance_GetUserBalance = function(userId, groupId) {
	var balance = 0.00;
	var query;
	
	if (groupId) {
		query = { 
			'splits.userId': userId, 
			groupId: groupId
		};
	} else {
		query = { 
			'splits.userId': userId 
		};
	}
	
	// find all matching transactions and total the split amounts
	// where the userId matches
	var transactions = Transactions.find(query, { splits: 1 });
	transactions.forEach(function (transaction) {
		transaction.splits.forEach(function (split) {
			if (split.userId == userId) 
				balance += parseFloat(split.amount.toFixed(2));
		});
	});
	
	return parseFloat(balance.toFixed(2));
};

balance_parseDate = function(dateStr) {
	return moment(dateStr, ["MM/DD/YY", "MM/DD/YYYY", "YYYY-MM-DD"]).toDate();
};

balance_formatDate = function(dateStr) {
	return moment.utc(dateStr).format("M/D/YYYY");
};

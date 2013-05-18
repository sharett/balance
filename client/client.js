// Balance -- client

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

///////////////////////////////////////////////////////////////////////////////
// Members

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

Template.member.member = function () {
  return Meteor.users.findOne(Session.get("selected_member"));
};

Template.member.balance = function () {
  var groupId = Session.get("selected_group");
  if (!groupId)
	  return null;

  return balance_formatAmount(
		balance_GetUserBalance(Session.get("selected_member"), groupId)
	);
};

Template.member.total_balance = function () {
	if (Meteor.userId() == Session.get("selected_member")) {
		return balance_formatAmount(
			balance_GetUserBalance(Session.get("selected_member"))
		);
	} else {
		return null;
	}
};

Template.member.credit = function () {
  // look up the credit between the current user and the selected user
  var selectedMember = Session.get("selected_member");
  var creditLine = CreditLines.findOne({creditor: Meteor.userId(), debtor: selectedMember});
  var amount = 0.00;
  if (creditLine && typeof creditLine.amount == 'number') {
	amount = creditLine.amount;
  }
  return amount.toFixed(2);
};

Template.member.credit_to_me = function () {
  // look up the credit between the selected user and the current user
  var selectedMember = Session.get("selected_member");
  var creditLine = CreditLines.findOne({creditor: selectedMember, debtor: Meteor.userId()});
  var amount = 0.00;
  if (creditLine && typeof creditLine.amount == 'number') {
		amount = creditLine.amount;
  }
  return amount.toFixed(2);
};


Template.member.me = function () {
  return Meteor.userId() == Session.get("selected_member");
};

Template.member.note = function () {
  return Session.get("member_note");
};
  
Template.member.events({
  'click .extend': function (event, template) {
	var amount = parseFloat(template.find(".credit").value);
	if (amount >= 0) {
    Meteor.call('extendCredit', {
			debtor: Session.get("selected_member"),
			amount: parseFloat(parseFloat(amount).toFixed(2)),
			}, function (error, profile) {
				if (!error) {
					Session.set("member_note", "Credit limit has been updated.");
				}
			});
		} else {
			Session.set("member_note", "Credit limit can not be negative.");
		}
  },
  'focus .credit': function (event) {
    Session.set("member_note", '');
  },
  'click .member-return': function () {
    Session.set("selected_member", null);
  },
});

Template.member_detail.selected = function () {
  return Session.equals("selected_member", this._id) ? "selected" : '';
};

Template.member_detail.displayName = function () {
  return displayName(this);
};

Template.member_detail.balance = function () {
  var groupId = Session.get("selected_group");
  if (!groupId)
	  return null;
	  
	return balance_formatAmount(balance_GetUserBalance(this._id, groupId));
};

Template.member_detail.events({
  'click': function () {
    Session.set("selected_member", this._id);
    Session.set("member_note", null);
  },
});

///////////////////////////////////////////////////////////////////////////////
// Transactions

Template.transactions.transactions = function () {
  var selected_group = Session.get("selected_group");
	
  if (selected_group) {
		// load the names of the users in this group
		var group = Groups.findOne(selected_group);
		var members = Meteor.users.find({_id: {$in: group.members}});
		var member_assoc = new Array();
		members.forEach(function (member) {
			member_assoc[member._id] = displayName(member);
		});

		// load the transactions for this group
		var transactionsDb = Transactions.find(
			{ groupId: selected_group }, 
			{sort: {date: -1, description: 1}}
		);
		Session.set("transaction_count", transactionsDb.count());
		
		// put the debits and credits together and format
		var transactions = new Array();
		transactionsDb.forEach(function (transaction) {
			var debits = new Array();
			var credits = new Array();
			transaction.splits.forEach(function (split) {
				if (split.amount < 0) {
					debits.push(member_assoc[split.userId] + ' $' + 
						balance_formatAmount(Math.abs(split.amount)));
				} else {
					credits.push(member_assoc[split.userId] + ' $' + 
					  balance_formatAmount(split.amount));
				}
			});
			transaction.debits = debits.join('; ');
			transaction.credits = credits.join('; ');
			
			// format the total
			transaction.total = '$' + balance_formatAmount(transaction.total);
			
			// add to the rebuilt list
			transactions.push(transaction);
		});
		
		return transactions;
  } else {
		Session.set("transaction_count", 0);
		return null;
  }
};

Template.transactions.transaction_count = function() {
  return Session.get("transaction_count");
};

Template.transactions.events({
  'click .transaction-add': function () {
    Session.set("selected_transaction", null);
    openTransactionDialog(true);  // create
  },
});

Template.transaction.selected = function () {
  return Session.equals("selected_transaction", this._id);
};

Template.transaction.events({
  'click .transaction-edit': function () {
    Session.set("selected_transaction", this._id);
    openTransactionDialog(false);  // edit
  },
  'click .transaction-remove': function () {
		if (confirm("Are you sure you want to remove this transaction?")) {
			// remove the transaction
			Meteor.call('removeTransaction', {
					transactionId: this._id,
				}, 
				function (error, transaction) {
					if (error) {
						alert(error.reason);
					} else {
						Session.set("selected_transaction", null);
					}
			});
		}
  },
});


///////////////////////////////////////////////////////////////////////////////
// Edit profile dialog

var openProfileDialog = function () {
  // does the profile already exist?
  if (typeof Meteor.user().profile == "object") {
		Template.editProfile.full_name = Meteor.user().profile.name;
		Template.editProfile.nickname = Meteor.user().profile.nickname;
  } else {
		Template.editProfile.full_name = '';
		Template.editProfile.nickname = '';
	}
  Session.set("profileError", null);
  Session.set("showProfileDialog", true);
};

Template.dialogs.showProfileDialog = function () {
  return Session.get("showProfileDialog");
};

Template.editProfile.events({
  'click .save': function (event, template) {
    var full_name = template.find(".full_name").value;
    var nickname = template.find(".nickname").value;
    
    if (full_name.length) {
      Meteor.call('updateProfile', {
        name: full_name,
        nickname: nickname,
      }, function (error, profile) {
				if (error) {
					Session.set("profileError", error.reason);
				} else {
					Session.set("showProfileDialog", false);
				}
      });
    } else {
      Session.set("profileError",
                  "A name is required.");
    }
  },

  'click .cancel': function () {
    Session.set("showProfileDialog", false);
  }
});

Template.editProfile.error = function () {
  return Session.get("profileError");
};

///////////////////////////////////////////////////////////////////////////////
// editGroup dialog

var openEditGroupDialog = function (create) {
  if (!create) {
		// is there a selected group?
		var groupId = Session.get("selected_group");
		if (!groupId)
			return;
		var group = Groups.findOne(groupId);
    Template.editGroup.group_name = group.name;
    Template.editGroup.description = group.description;
    Template.editGroup.create = false;
  } else {
    Template.editGroup.create = true;
  }

  Session.set("editGroupError", null);
  Session.set("showEditGroupDialog", create ? 'create' : 'update');
};

Template.dialogs.showEditGroupDialog = function () {
  return Session.get("showEditGroupDialog");
};

Template.editGroup.events({
  'click .save': function (event, template) {
		var groupId = Session.get("selected_group");
		
		var name = template.find(".group_name").value;
		var description = template.find(".description").value;
		
		if (name.length) {
			if (Session.get("showEditGroupDialog") == 'create') {
				// create a new group
				Meteor.call('createGroup', {
					name: name,
					description: description,
				}, function (error, group) {
					if (! error) {
						Session.set("selected_group", group);
						Session.set("selected_member", null);
						// resubscribe to transactions when group membership changes
						Meteor.subscribe("transactions");
					}
				});
			} else {
				// update an existing group
				Groups.update(groupId, {$set: {'name': name, 'description': description } });
			}
			
			Session.set("showEditGroupDialog", false);
		} else {
			Session.set("editGroupError",
									"A name is required.");
		}
	},

  'click .cancel': function () {
    Session.set("showEditGroupDialog", false);
  }
});

Template.editGroup.error = function () {
  return Session.get("editGroupError");
};

///////////////////////////////////////////////////////////////////////////////
// editTransaction dialog

var openTransactionDialog = function (create) {
  if (!create) {
		// is there a selected transaction?
		var transactionId = Session.get("selected_transaction");
		if (!transactionId)
			return;
	  var transaction = Transactions.findOne(transactionId);
	  Template.editTransaction.transaction_date = transaction.date;
    Template.editTransaction.transaction_description = transaction.description;
    Template.editTransaction.create = false;
  } else {
		var d = new Date();
    Template.editTransaction.transaction_date = 
			(d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear().toString().substr(-2);
    Template.editTransaction.transaction_description = '';
    Template.editTransaction.create = true;
  }

  Session.set("editTransactionError", null);
  Session.set("editTransactionTotal", "$0.00");
  Session.set("editTransactionTotalOk", "alert-success");
  Session.set("showTransactionDialog", create ? 'create' : 'update');
};

Template.editTransaction.group_members = function () {
	var membersDb = balance_GetGroupMembers(Session.get("selected_group"));
	
	var transactionId = Session.get("selected_transaction");
	if (transactionId) {
  	var members = new Array();
		var transaction = Transactions.findOne(transactionId);
		membersDb.forEach(function (member) {
			transaction.splits.forEach(function (split) {
				if (split.userId == member._id) {
					if (split.amount < 0) {
						member.debit = -(split.amount);
					} else {
						member.credit = split.amount;
					}
				}
			});
			members.push(member);
		});
	  return members;
	} else {
		return membersDb;
	}
};

Template.editTransaction.total = function () {
	return Session.get("editTransactionTotal");
};

Template.editTransaction.total_ok = function () {
	return Session.get("editTransactionTotalOk");
};

Template.dialogs.showTransactionDialog = function () {
  return Session.get("showTransactionDialog");
};

Template.editTransaction.events({
  'click .save': function (event, template) {
		var transactionId = Session.get("selected_transaction");
		var groupId = Session.get("selected_group");
		
		var date = template.find(".transaction-date").value;
		var description = template.find(".transaction-description").value;
		var debits = template.findAll(".transaction-debit");
		var credits = template.findAll(".transaction-credit");
				
		// prepare splits
		var splits = new Array();
		balance_prepareSplits(splits, debits, credits);
		
		if (Session.get("showTransactionDialog") == 'create') {
			// create a new transaction
			Meteor.call('insertTransaction', {
					groupId: groupId,
					date: date,
					description: description,
					splits: splits,
				}, 
				function (error, transaction) {
					if (error) {
						Session.set("editTransactionError", error.reason);
					} else {
						Session.set("showTransactionDialog", false);	
					}
			});
		} else {
			// update an existing transaction
			Meteor.call('updateTransaction', {
				  transactionId: transactionId,
					groupId: groupId,
					date: date,
					description: description,
					splits: splits,
				}, 
				function (error, transaction) {
					if (error) {
						Session.set("editTransactionError", error.reason);
					} else {
						Session.set("showTransactionDialog", false);	
					}
			}); 
		}
  },
  'click .cancel': function () {
    Session.set("showTransactionDialog", false);
  },
  'keyup .transaction-amount': function (event, template) {
		// total the entered transactions
		var debits = template.findAll(".transaction-debit");
		var credits = template.findAll(".transaction-credit");
		var total = new Number(0.00);
	  
    debits.forEach(function (amount) {
			var amountValue = parseFloat(amount.value);
		  if (!isNaN(amountValue))
				total -= parseFloat(amountValue.toFixed(2));
	  });
	  credits.forEach(function (amount) {
			var amountValue = parseFloat(amount.value);
		  if (!isNaN(amountValue))
				total += parseFloat(amountValue.toFixed(2));
	  });
	  
	  total = parseFloat(total.toFixed(2));
	  Session.set("editTransactionTotal", '$' + total.toFixed(2));
	  Session.set("editTransactionTotalOk", (total == 0.00) ? "success" : "error");
	},
});

Template.editTransaction.error = function () {
  return Session.get("editTransactionError");
};

Template.editTransactionMember.displayName = function () {
  return displayName(this);
};

///////////////////////////////////////////////////////////////////////////

function balance_GetUserBalance(userId, groupId) {
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
}

function balance_GetGroupMembers(groupId) {
	// load the names of the users in this group
	var group = Groups.findOne(groupId);
	if (!group)
		return null;
	
	return Meteor.users.find({_id: {$in: group.members}});
}

function balance_prepareSplits(splits, debits, credits) {
	// splits is an array of:
	//  userId, amount, description
	// debits and credits are DOM element arrays.  The Id is
	//  either c_(userId) or d_(userId)
	debits.forEach(function (debit) {
		if (typeof debit.id !== "string")
		  return;
		if (isNaN(parseFloat(debit.value)))
		  return;
		  
		splits.push({
			userId: debit.id.substr(2),
			amount: -(parseFloat(debit.value)),
			description: '',
		});
	});
	credits.forEach(function (credit) {
		if (typeof credit.id !== "string")
		  return;
		if (isNaN(parseFloat(credit.value)))
		  return;
		  
		splits.push({
			userId: credit.id.substr(2),
			amount: parseFloat(credit.value),
			description: '',
		});
	});
	
	return true;
}

function balance_formatAmount(amount) {
	amount = amount.toFixed(2);
	if (amount.substr(-3) == '.00')
		amount = amount.substr(0, amount.length - 3);
		
	return amount;
}


///////////////////////////////////////////////////////////////////////////

balance_prepareSplits = function(splits, debits, credits) {
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
};

balance_formatAmount = function(amount) {
	amount = amount.toFixed(2);
	if (amount.substr(-3) == '.00')
		amount = amount.substr(0, amount.length - 3);

	return amount;
};

balance_toFixed = function(amount, precision) {
	if (amount == '') {
		return 0;
	} else {
		return parseFloat(parseFloat(amount).toFixed(precision));
	}
}

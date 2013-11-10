balance_sendEmail = function(subject, to_user, text) {
	check([subject, text], [String]);
	check([to_user], [Object]);
	
	// look up contact e-mail for selected user
	if (!to_user)
		return false;
	
	var to = balance_contactEmail(to_user);
	if (!to)
		return false;
		
	// add signature
	text += Accounts.emailTemplates.signature;
		
	Email.send({
		to: to,
		from: Accounts.emailTemplates.from,
		subject: subject,
		text: text,
	});
};

balance_contactEmail = function (user) {
  if (user.emails && user.emails.length)
    return user.emails[0].address;
  if (user.services && user.services.facebook && user.services.facebook.email)
    return user.services.facebook.email;
  return null;
};

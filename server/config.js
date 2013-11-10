Accounts.config({
	sendVerificationEmail: true,
});

Accounts.emailTemplates.siteName = "Balance demo";
Accounts.emailTemplates.from = "Balance demo <balance@example.com>";
Accounts.emailTemplates.signature = 
	"--\n" +
	"balance@example.com\n" +
	"http://balance.example.com\n\n";


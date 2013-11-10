balance
=======

Balance is a tool to keep track of shared finances for groups.

# Installation

1. npm install -g meteorite (if not already installed)
2. git clone https://github.com/sharett/balance
3. cd balance
4. mrt
5. open browser to http://localhost:3000

# Configuration

Edit the file 'server/config.js':
1. Set "Accounts.emailTemplates.siteName" to the unique name of your site (example: "Balance").
2. Set "Accounts.emailTemplates.from" to the e-mail name and from address (example: "Balance <balance@example.com>").
3. Set "Accounts.emailTemplates.signature" to the signature at the end of every e-mail sent by the site
  (example: "--\n" + "balance@example.com\n" + "http://balance.example.com\n\n";

Edit the file 'lib/config.js':
1. Set "adminEmail" to the e-mail address that can administer the site.

# Working site
http://balance.sharett.org

# License
MIT license

# Author
Alex Jarrett
http://www.sharett.org


balance
=======

Version 1.1 - November 13, 2015

Built with Meteor 1.2.1

11/5/22: Meteor has undergone extensive changes since the version this was built for. Balance would need to be rewritten to work on a modern Meteor setup. If you have used the working version of Balance at balance.sharett.org, that has now been shut down. If you would like an export of your data from that site please contact me via sharett.org

Balance is a tool to keep track of shared finances for groups.

# Installation

Install Meteor if you haven't already:

1. curl https://install.meteor.com/ | sh

Install Balance:

1. git clone https://github.com/sharett/balance
2. cd balance
3. meteor
4. open browser to http://localhost:3000

Deploy:

1. meteor deploy <site name>.meteor.com

# Configuration

Edit the file 'server/config.js':

1. Set "Accounts.emailTemplates.siteName" to the unique name of your site (example: "Balance").
2. Set "Accounts.emailTemplates.from" to the e-mail name and from address (example: "Balance <balance@example.com>").
3. Set "Accounts.emailTemplates.signature" to the signature at the end of every e-mail sent by the site
  (example: "--\n" + "balance@example.com\n" + "http://balance.example.com\n\n";

Edit the file 'lib/config.js':

1. Set "adminEmail" to the e-mail address that can administer the site.

# License
MIT license

# Author
Alex Jarrett (http://www.sharett.org)

white - a web app for managing lists of things
==============================================

A todo list as simple as a piece of paper - powered by HTML5, CSS, jQuery, Web Sockets, PHP, Slim for RESTful API, and MongoDB. Lists are always kept up-to-date in real time on all open and running clients via the power of Web Sockets.

List support provided by appending `#/list/{listname}/{secret}` to URLs, where `{listname}` is anything you want to name your list and `{secret}` is a secret passphrase defined in `bin/config.php`.

Example: `https://www.example.com/white/www/#/list/stuff-to-remember/a39f9b023c023ef20da03`

You may also see all lists in the system at `#/lists/{secret}`. See below in the
INSTALL section for information. You will need to configure `{secret}` in `bin/config.php`.

Lists are sorted by last modified descending, with a rainbow subsort. Rainbow sorting is new and best described by example. First we have chosen only 6 of the rainbow colors to maintain high contrast between each color. We have: red, orange, yellow, green, blue, purple. Next we count the number of lists and divide by 6 (the number of colors). This number is called the split. The list of items is copied and sorted so that the first items in alphabetical order are red. The first 'split' number of them. Then the next split is colored orange, and so on until purple. This is all done so that when viewing the list of last modified lists you can look for the red items and know that they are first alphabetical, and the purple items are last alphabetical. It's just a simple way to see two sorting algorithms at the same time.

Syntax
======
Each todo item is a single line of text.

URLs and emails will automatically be linked using [Autolinker.js](https://github.com/gregjacobs/Autolinker.js).

There are 3 special labels: priority, label, and due date. See the following example todo items for usage.

A priority is represented by an exclamation mark followed by an integer. The higher the integer, the higher the priority. A todo item may only contain one of these. Items will be sorted accordingly - the higher priorities towards the top.

    !10

A label is represented by a pound symbol followed by a word containing only lower and upper case letters, numbers, underscores, and dashes. Labels are used for grouping and sorting todo list items. A todo list item may contain any number of labels.

    #these #are #labels

A due date is an @ symbol followed by a due date inside of left and right angle brackets. Once the todo list item is saved the reminder is queued using the UNIX `at` command and the syntax is stripped so that you don't queue the todo item again.

The date and time inside of `@<...>` is parsed with the PHP `strtotime()` function. This means it may follow patterns like the following. See http://php.net/strtotime

    @<12:00 4/28/2015>
    @<+1 hour>
    @<Friday 5pm>

Also note that the reminder will be stored in the database as `HH:mm dd/mm/YYYY` and will appear in your list. The original reminder syntax will be stripped.

To enable due dates you must configure them in `bin/config.php`.

    $cfg['enable-due'] = true;
    $cfg['due-from'] = array("reminders@example.com");
    $cfg['due-to'] = array("foobar@example.com");
    $cfg['due-subject-prefix'] = "[white]";
    $cfg['due-truncate-subject-at'] = 32;

If you're not familiar with `at` commands you may be interested in installing [https://github.com/wsams/zoopaz-reminders](https://github.com/wsams/zoopaz-reminders). This will allow you to add and remove reminders from a web interface.

Dependencies
============
* PHP
* MongoDB
* Composer
* Ideally SSL
* UNIX commands if reminders are enabled: `at`, `sudo`, `echo`, `mail`

INSTALL
=======

Install composer dependencies, or `update` if upgrading white.

```bash
composer.phar install
```

Run white websocket server. Edit the `bindir` variable to point to the `bin` directory in the file `bin/run.sh`. Then execute the `bin/run.sh` script.

```bash
cd /path/to/white
bin/run.sh
```

Copy `bin/example.config.php` to `bin/config.php` and update the settings.

Be sure to edit `$cfg['secret']`. This is a secret token that will allow you to view all lists in the system. This hash URL is,

    https://www.example.com/white/www/#/lists/your-secret-token-goes-here

This token should be long and complicated as it will be viewable in the URL. Here's a handy way to generate one: [https://duckduckgo.com/?q=sha512+my+secret+password](https://duckduckgo.com/?q=sha512+my+secret+password)

Copy `www/js/example.config.js` to `www/js/config.js` and update the JavaScript settings.

For reminders you must also do something similar to the following so that your web server user can execute `at`.

Add similar lines to `/etc/sudoers`.

    ALL ALL=NOPASSWD: /usr/bin/at
    ALL ALL=NOPASSWD: /usr/bin/atq
    ALL ALL=NOPASSWD: /usr/bin/atrm

Future versions may use `/etc/at.allow`.

You may need to setup URL rewriting to support the clean URLs used by the Slim `services.php` file. The jQuery ajax calls point to `services/`. See http://docs.slimframework.com/routing/rewrite/ for information on rewriting URLs instead of pointing directly at `services.php`.

Open `www/index.php` in a browser.

Update the font
===============

Copy `www/css/example.white-font.ttf` to `www/css/white-font.ttf` or add your own TTF font. Just update `www/css/white-font.ttf` and it will be applied.

Setup Stunnel for SSL encryption for secure web sockets
========================================================

The `www/js/example.config.js` file defaults to the `ws://` protocol on port 9880.

The port used in `bin/example.config.php` and `www/js/example.config.js` are both 9880.

When you switch to using a secure websocket with protocol `wss://` you will need to change the port in `www/js/example.config.js` to 9443 if using the stunnel configuration below. On many machines edit `/etc/stunnel/stunnel.conf` and add the following. You'll need to generate a certificate if you don't have one. You can get free SSL certificates from sites like startssl.com.

    cert = /etc/apache2/ssl/cert.pem

    [white]
    accept = YOUR_PUBLIC_IP_ADDRESS:9443
    connect = 127.0.0.1:9880

Restart stunnel.

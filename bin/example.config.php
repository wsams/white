<?php

$cfg['webSocketPort'] = 9880;
$cfg['mongoHost'] = "localhost:27017";
$cfg['mongoDatabase'] = "white";

$cfg['secret'] = "?a= replace this with another string &b= it is used for administration";

// http://us3.php.net/manual/en/timezones.php
$cfg['timezone'] = "ENTER TIMEZONE HERE";

// Set to 'true' to enable reminders.
$cfg['enable-due'] = false;
// Emails reminders will be sent From this address.
$cfg['due-from'] = array("reminders@example.com");
// Send reminders to these email addresses.
$cfg['due-to'] = array("foobar@example.com");
// The email subject will be prefixed by this string.
$cfg['due-subject-prefix'] = "[white]";
// The todo list item will be truncated at this number of characters in the subject field.
// The body will contain the entire todo list item.
$cfg['due-truncate-subject-at'] = 32;

// Sort todo lists in left sidebar.
// Values: last-modified, ascending
$cfg['list-sort-order'] = "ascending";

// Configure the date format for each todo item. Uses PHP's date() function,
// http://php.net/manual/en/function.date.php
$cfg['date-format'] = "F j, Y, g:i a";

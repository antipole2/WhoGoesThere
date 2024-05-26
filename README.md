# WhoGoesThere
 
The Connections tab of the Settings panel includes the option to display NMEA traffic.
This is useful but can be difficult to use.  Data rushes by.
You can pause this stream but then only see a small snapshot of what is happening.

The _WhoGoesThere_ JavaScript provides more useable insights.

It starts by listing the active connections as seen through the plugins API.

It then listens to the traffic for 10 seconds (configurable) and reports.

## OpenCPN messages

It displays a list of the OpenCPN messagaes received since the plugin was started.

## NMEA0183 data

It displays one sample of each type of NMEA0183 sentence, prefaced by the count of that sentence type.

## NMEA2000 devices

If you have an NMEA2000 connection, the script will have sent PGN59904 to all stations, requesting them to send PGN126996.
The responses are displayed.

This reveals which devices are on the network and at which address.
(Some  complex devices have more than one presence and give more than one response for a given address.)

The script then lists the PGNs it has seen, including their count and originating address.
Using the earlier table, you can see which device is sending which PGN.

## NMEA2000 data

The script includes the statement

```var NMEA2000Decode = false;```

If this is changed to

```var NMEA2000Decode = true;```

then the script will also decode the samples and display them as JSON. 

## Installing the script

This script needs JavaScript plugin v3.0.4 or later.

1. Copy this URL to your clipboard (copy the link - do not follow it) `https://raw.githubusercontent.com/antipole2/WhoGoesThere/main/whogoesthere.js`
2. In a JavaScript console choose `Load` and then `URL on clipboard`.  The script should be loaded into the script pane.
3. Choose `Run` to start the script.

If you want to run the script when not online, you will need to save it to a local file.

Alternatively, you can fork the repository if you want to evolve the script.

## Support

The script has an experimental arrangement for advising of and obtaining updates.

The script can be discussed in the Discussion forum above.

Issues can be reported using the Issues tab.

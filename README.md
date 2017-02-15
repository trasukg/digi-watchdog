# digi-watchdog
Watchdog system for APRS digipeater

# Operation

The purpose of this package is to keep an eye on BARC's APRS digipeater, VE3RSB.  We've
had some difficulties with it going offline.  The failure mode is that the
TinyTrak 4 will stop receiving, but will still transmit.  Power-cycling the
TT4 fixes the problem, at least for some period of time.

The program operates in two modes.  

The 'remote' mode (default) listens to the
off-air feed and checks to see if the digipeater is listed in any digipeating paths
in the packets received.  We need to check for the digipeater paths because under
the failure mode mentioned, the digi will still beacon.  So a lack of packets that
have been repeated through RSB probably indicates that RSB is not receiving or
digipeating.  In this case, 'digi-watchdog' will send an email to the designated
receiver to indicate that the digi is offline.  When a packet is finally received,
'digi-watchdog' sends another email to indicate the digi is back on line.

The 'repeater-site' mode, started up by using the '--repeater-site' option,
listens on a 'share-tnc' port.  In this case, we're looking for receipt of any packet
that does not come from VE3RSB (i.e. is received from the outside).  If no outside
packets are received over some period (probably 15 minutes would be fine), then
'digi-watchdog' will issue a 'power-cycle' command to power-cycle the repeater and
reset the TT4.  Of course, power-cycling a repeater is not a trivial event - we don't
want to do it too often.  So after a power-cycle, 'digi-watchdog' will not power-cycle
again for some time period (say, 4 hours), even if a failure is detected again,
although it will output a log message to indicate that a failure was detected.  If
the failure is still present at the end of the lockout period, 'digi-watchdog' will
power-cycle the repeater again.

# Configuration

'digi-watchdog' needs to know the following things:

- failure time: the maximum that we can hear no packets of interest before we
assume that the digi is 'down'.
- holdoff time:  How long we will hold off on a power cycle after doing a power
cycle.
- callsign:  The callsign that we're interested in monitoring.
- power cycle command - The shell command to issue to cycle the power
- email command - The command to send email

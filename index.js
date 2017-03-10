#!/usr/bin/env node

/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

/*
This is a command-line utility to monitor the BARC APRS digipeater
*/
var util=require('util');
var SocketKISSFrameEndpoint=require('utils-for-aprs').SocketKISSFrameEndpoint;
var APRSProcessor=require('utils-for-aprs').APRSProcessor;
var RemoteModeStateMachine=require("./RemoteModeStateMachine");
var RepeaterSiteModeStateMachine=require("./RepeaterSiteModeStateMachine");
var ax25utils=require('utils-for-aprs').ax25utils;
var exec=require('child_process').exec;

var getopt=require('node-getopt').create([
  ['', 'repeater-site', 'enable repeater-site mode']
]).bindHelp();

var opt=getopt.parseSystem();

console.log("opt.argv=" + opt.argv);

if (opt.argv.length != 1) {
  getopt.showHelp()
  return;
}

var res=/([^\:]+):([0-9]+)/.exec(opt.argv[0]);
if(!res) {
  getopt.showHelp()
  return;
}
var host=res[1];
var port=res[2];

/*
The pipeline is sort of like this:
Endpoint -> APRSProcessor -> Filter -> StateMachine
*/

//Create the endpoint
var endpoint=new SocketKISSFrameEndpoint();
endpoint.host=host;
endpoint.port=port;
var aprsProcessor=new APRSProcessor();

// Filter returns true if VE3RSB appears in the repeater path (not in the source)
var ve3rsbInPath=function(frame) {
  for (var i in frame.repeaterPath) {
    if (frame.repeaterPath[i].callsign=='VE3RSB') {
      return true;
    }
  }
  if (frame.forwardingRepeaterPath) {
    for (var i in frame.forwardingRepeaterPath) {
      if (frame.forwardingRepeaterPath[i].callsign=='VE3RSB') {
        return true;
      }
    }
  }
  return false;
}

var ve3rsbNotInSource=function(frame) {
  return(!frame.forwardingRepeaterPath && frame.source.callsign != 'VE3RSB');
}

var stateMachine, filter;

if (opt.options['repeater-site']) {
  console.log('Repeater site mode was selected');
  filter=ve3rsbNotInSource;
  stateMachine=new RepeaterSiteModeStateMachine( {
    failureTime: 10*60,
    holdoffTime: 240*60
  });
  stateMachine.on('failed', function() {
    console.log("Digipeater appears to have failed")
    powerCycleRepeater();
  });
  stateMachine.on('recovered', function() {
    console.log("Digipeater appears to have come back online.");
  });
  stateMachine.on('failedInHoldoff', function() {
    console.log("Digipeater appears to have failed while in holdoff.");
  });

} else {
  console.log('Remote site mode was selected');
  filter=ve3rsbInPath;
  stateMachine=new RemoteModeStateMachine( { failureTime: 8*60 });
  stateMachine.on('failed', function() {
    console.log("Digipeater appears to have failed");
    // TODO: Fire off an email here...
  });
  stateMachine.on('recovered', function() {
    console.log("Digipeater appears to have come back online.");
    // TODO: Fire off an email here...
  });
}

// When we get data on the aprsProcessor, show it on the console.
aprsProcessor.on('aprsData', function(frame) {
  // Filter frame to see if it matches the criteria.
  if (filter(frame)) {
    stateMachine.trigger();
    /*console.log( "Good: " + ax25utils.addressToString(frame.source) +
    '->' + ax25utils.addressToString(frame.destination) +
    ' (' + ax25utils.repeaterPathToString(frame.repeaterPath) + ')' +
    ((frame.forwardingSource!=undefined)?(
      " via " + ax25utils.addressToString(frame.forwardingSource) +
      '->' + ax25utils.addressToString(frame.forwardingDestination) +
      ' (' + ax25utils.repeaterPathToString(frame.forwardingRepeaterPath) + ')')
      : '') +
      frame.info);*/
  } else {
    /*console.log( "Didn't qualify: " + ax25utils.addressToString(frame.source) +
    '->' + ax25utils.addressToString(frame.destination) +
    ' (' + ax25utils.repeaterPathToString(frame.repeaterPath) + ')' +
    ((frame.forwardingSource!=undefined)?(
      " via " + ax25utils.addressToString(frame.forwardingSource) +
      '->' + ax25utils.addressToString(frame.forwardingDestination) +
      ' (' + ax25utils.repeaterPathToString(frame.forwardingRepeaterPath) + ')')
      : '') +
      frame.info);*/
  }
});
aprsProcessor.on('error', function(err, frame) {
  console.log("Got error event:" + err);
  console.log("Frame is:" + JSON.stringify(frame));
});

// The endpoint provides de-escaped KISS frames.  Pass them on to the aprsProcessor
// Log interesting events...
endpoint.on('connect', function(connection) {
  console.log("Connected to port " + endpoint.port);
  connection.on('data', function(frame) {
    aprsProcessor.data(frame);
  });
  connection.on('disconnect', function() {
    console.log('Lost connection');
  });
});

// Turn on the endpoint.  It will attempt to connect in a persistent fashion.
stateMachine.start();
endpoint.enable();

var powerCycleRepeater=function() {
  var ps=exec('power-cycle repeater 10 --dry-run --comment "Watchdog was triggered"');
  ps.stdout.on('data', function(out) {
    console.log(out.toString());
  });
  ps.stderr.on('data', function(out) {
    console.log(out.toString());
  });
}

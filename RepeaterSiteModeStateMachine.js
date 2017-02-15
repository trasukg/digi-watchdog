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

var EventEmitter=require('events');
var util=require('util');
var StateMachine=require("./StateMachine");

var states= {
  Idle: {
    start: 'Running'
  },
  Running: {
    onEntry: function() {
      console.log("Running.onEntry()");
      this.triggerFailTimer();
    },
    timeout: 'Failed',
    trigger: function() {
      this.triggerFailTimer();
    }
  },
  Failed: {
    onEntry: function() {
      this.emit('failed');
      this.triggerHoldoffTimer();
      console.log("Failed.onEntry()");
    },
    trigger: 'RunningInHoldoff',
    holdoffTimeout: function() {
      console.log("Failed.holdoffTimeout()");
      this.emit('failed');
      this.triggerHoldoffTimer();
    }
  },
  RunningInHoldoff: {
    onEntry: function() {
      console.log("RunningInHoldoff.onEntry()");
      this.emit('recovered');
      this.triggerFailTimer();
    },
    timeout: 'FailedInHoldoff',
    trigger: function() {
      this.triggerFailTimer();
    },
    holdoffTimeout: 'Running'
  },
  FailedInHoldoff: {
    onEntry: function() {
      console.log("Failed while in holdoff.  'failed' event deferred.");
      this.emit('failedInHoldoff');
    },
    holdoffTimeout: 'Failed',
    trigger: 'RunningInHoldoff'
  }
};

var RepeaterSiteModeStateMachine=function(parameters) {
  // Parameters use time in seconds.
  this.timeoutInMs=parameters.failureTime*1000;
  this.holdoffInMs=parameters.holdoffTime*1000;
  EventEmitter.call(this);
  StateMachine.call(this, states, 'Idle');
};
util.inherits(RepeaterSiteModeStateMachine, EventEmitter);

RepeaterSiteModeStateMachine.prototype.triggerFailTimer=function() {
  if (this._timeoutObject) {
    clearTimeout(this._timeoutObject);
  }
  var self=this;

  self._timeoutObject=setTimeout(function() {
    self.timeout();
  }, self.timeoutInMs)
}

RepeaterSiteModeStateMachine.prototype.triggerHoldoffTimer=function() {
  if (this._holdoffTimeoutObject) {
    clearTimeout(this._holdoffTimeoutObject);
  }
  var self=this;

  self._holdoffTimeoutObject=setTimeout(function() {
    self.holdoffTimeout();
  }, self.holdoffInMs)
}

module.exports=RepeaterSiteModeStateMachine;

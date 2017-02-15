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

var RepeaterModeStateMachine=require("../RepeaterSiteModeStateMachine");

describe("The RepeaterSiteModeStateMachine generator", function() {

  var failCallback;
  var failInHoldoffCallback;

  beforeEach(function() {
    failCallback = jasmine.createSpy("failCallback");
    failInHoldoffCallback = jasmine.createSpy("failInHoldoffCallback");
    jasmine.clock().install();
  });

  afterEach(function() {
    jasmine.clock().uninstall();
  });

  it("Fails after the failure time if there's no input", function() {
    var UUT=new RepeaterModeStateMachine({
      failureTime: 10*60,
      holdoffTime: 240*60
    });

    UUT.on('failed', failCallback);
    UUT.start();
    jasmine.clock().tick(10*60*1000-100);

    expect(failCallback).not.toHaveBeenCalled();
    jasmine.clock().tick(200);
    expect(failCallback).toHaveBeenCalled();
  });
  it("Fails after the failure time, after trigger", function() {
    var UUT=new RepeaterModeStateMachine({
      failureTime: 10*60,
      holdoffTime: 240*60
    });

    UUT.on('failed', failCallback);
    UUT.start();
    jasmine.clock().tick(10*60*1000-100); // 100 ms before failure time.
    expect(failCallback).not.toHaveBeenCalled();
    UUT.trigger();
    jasmine.clock().tick(10*60*1000-100); // 100 ms before failure time.
    expect(failCallback).not.toHaveBeenCalled();
    jasmine.clock().tick(200); //Should be 100 ms after failure time.
    expect(failCallback).toHaveBeenCalled();
  });
  it("Doesn't emit fail while in holdoff", function() {
    var UUT=new RepeaterModeStateMachine({
      failureTime: 10*60,
      holdoffTime: 240*60
    });
    var recovered=jasmine.createSpy('recovered');
    UUT.on('failed', failCallback);
    UUT.on('recovered', recovered);
    UUT.on('failedInHoldoff', failInHoldoffCallback);
    UUT.start();
    jasmine.clock().tick(10*60*1000-100); // 100 ms before failure time.
    expect(failCallback).not.toHaveBeenCalled();
    UUT.trigger();
    jasmine.clock().tick(10*60*1000-100); // 100 ms before failure time.
    expect(failCallback).not.toHaveBeenCalled();
    jasmine.clock().tick(200); //Should be 100 ms after failure time.
    expect(failCallback).toHaveBeenCalled();
    failCallback.calls.reset();
    UUT.trigger();
    expect(recovered).toHaveBeenCalled();
    expect(UUT.currentState.name).toBe('RunningInHoldoff')
    jasmine.clock().tick(10*60*1000+100); // 100 ms after fail time.
    expect(UUT.currentState.name).toBe('FailedInHoldoff')
    expect(failCallback).not.toHaveBeenCalled();
    expect(failInHoldoffCallback).toHaveBeenCalled();
    jasmine.clock().tick(240*60*1000);  // Go past the holdoff time.
    expect(failCallback).toHaveBeenCalled();
    expect(UUT.currentState.name).toBe('Failed');
  });
});

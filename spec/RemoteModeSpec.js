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

var RemoteModeStateMachine=require("../RemoteModeStateMachine");

describe("The RemoteModeStateMachine", function() {

  var failCallback;
  var recoveredCallback;
  var UUT;

  beforeEach(function() {
    failCallback = jasmine.createSpy("failCallback");
    recoveredCallback = jasmine.createSpy("recoveredCallback");
    jasmine.clock().install();
    UUT=new RemoteModeStateMachine({
      failureTime: 10*60,
    });
  });

  afterEach(function() {
    jasmine.clock().uninstall();
  });

  it("Fails after the failure time if there's no input", function() {
    UUT.on('failed', failCallback);
    UUT.start();
    jasmine.clock().tick(10*60*1000-100);

    expect(failCallback).not.toHaveBeenCalled();
    jasmine.clock().tick(200);
    expect(failCallback).toHaveBeenCalled();
  });
  it("Fails after the failure time, after trigger", function() {
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
  it("Emits recovered event when triggered again", function() {
    UUT.on('failed', failCallback);
    UUT.on('recovered', recoveredCallback);
    UUT.start();
    jasmine.clock().tick(10*60*1000-100); // 100 ms before failure time.
    expect(failCallback).not.toHaveBeenCalled();
    UUT.trigger();
    jasmine.clock().tick(10*60*1000-100); // 100 ms before failure time.
    expect(failCallback).not.toHaveBeenCalled();
    jasmine.clock().tick(200); //Should be 100 ms after failure time.
    expect(failCallback).toHaveBeenCalled();
    UUT.trigger();
    expect(recoveredCallback).toHaveBeenCalled();
  });
  it("Doesn't have a holdoff time", function() {
    UUT.on('failed', failCallback);
    UUT.on('recovered', recoveredCallback);
    UUT.start();
    jasmine.clock().tick(10*60*1000-100); // 100 ms before failure time.
    expect(failCallback).not.toHaveBeenCalled();
    UUT.trigger();
    jasmine.clock().tick(10*60*1000-100); // 100 ms before failure time.
    expect(failCallback).not.toHaveBeenCalled();
    jasmine.clock().tick(200); //Should be 100 ms after failure time.
    expect(failCallback).toHaveBeenCalled();
    UUT.trigger();
    expect(recoveredCallback).toHaveBeenCalled();
    failCallback.calls.reset();
    jasmine.clock().tick(10*60*1000+100);
    expect(failCallback).toHaveBeenCalled();
  });
});

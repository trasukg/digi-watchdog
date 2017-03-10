
var exec=require('child_process').exec;

var ps=exec('power-cycle repeater --dry-run');

ps.stdout.on('data', function(stdout) {
  console.log(stdout.toString());
});

ps.stderr.on('data', function(stdout) {
  console.log(stdout.toString());
});

ps.on('close', function(code) {
  console.log("exit code: " + code);
});

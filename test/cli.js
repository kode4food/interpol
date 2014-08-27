var nodeunit = require('nodeunit');
var interpol = require('../lib');
var commandLine = require('../lib/cli').commandLine;

function createConsole() {
  var buffer = [];
  return {
    log: append,
    info: append,
    warn: append,
    error: append,
    result: result,
    contains: contains
  };

  function append(value) {
    buffer.push(value);
  }

  function result() {
    return buffer.join('\n');
  }

  function contains(str) {
    return result().indexOf(str) !== -1;
  }
}

exports.cli = nodeunit.testCase({
  "Command Line Help": function (test) {
    var cons = createConsole();
    commandLine([], cons, function (exitCode) {
      test.ok(cons.contains("Usage"));
      test.done();
    });
  },

  "Successful Parse": function (test) {
    var cons = createConsole();
    commandLine(["-in", "./test/cli_success"], cons, function (exitCode) {
      test.ok(cons.contains("Interpol Parsing Complete"));
      test.ok(cons.contains("Success"));
      test.ok(!cons.contains("Warnings"));
      test.ok(!cons.contains("Failures"));
      test.done();
    });
  },

  "Warning Parse": function (test) {
    var cons = createConsole();
    commandLine(["-in", "./test/cli_warning"], cons, function (exitCode) {
      test.ok(cons.contains("Interpol Parsing Complete"));
      test.ok(cons.contains("Success"));
      test.ok(cons.contains("Warnings"));
      test.ok(!cons.contains("Failures"));
      test.done();
    });
  },

  "Failure Parse": function (test) {
    var cons = createConsole();
    commandLine(["-in", "./test/cli_failure"], cons, function (exitCode) {
      test.ok(cons.contains("Interpol Parsing Complete"));
      test.ok(!cons.contains("Success"));
      test.ok(!cons.contains("Warnings"));
      test.ok(cons.contains("Failures"));
      test.done();
    });
  },

  "Empty Path": function (test) {
    var cons = createConsole();
    commandLine(["-in", "./test/cli_empty"], cons, function (exitCode) {
      test.ok(!cons.contains("Interpol Parsing Complete"));
      test.ok(!cons.contains("Success"));
      test.ok(!cons.contains("Warnings"));
      test.ok(cons.contains("Error!"));
      test.ok(cons.contains("No files found matching"));
      test.done();
    });
  },

  "Parse Only": function (test) {
    var cons = createConsole();
    commandLine(["-parse", "-in", "./test/cli_success"], cons, function (exitCode) {
      test.ok(cons.contains("Interpol Parsing Complete"));
      test.ok(cons.contains("Success"));
      test.ok(!cons.contains("Warnings"));
      test.ok(!cons.contains("Failures"));
      test.done();
    });
  },

  "Create App Bundle": function (test) {
    var cons = createConsole();
    commandLine(["-app", "test_bundle.js", "-in", "./test/cli_success"], cons, function (exitCode) {
      test.ok(cons.contains("Interpol Parsing Complete"));
      test.ok(cons.contains("Success"));
      test.ok(!cons.contains("Warnings"));
      test.ok(!cons.contains("Failures"));
      test.done();
    });
  },

  "Create JSON Bundle": function (test) {
    var cons = createConsole();
    commandLine(["-json", "test_bundle.json", "-in", "./test/cli_success"], cons, function (exitCode) {
      test.ok(cons.contains("Interpol Parsing Complete"));
      test.ok(cons.contains("Success"));
      test.ok(!cons.contains("Warnings"));
      test.ok(!cons.contains("Failures"));
      test.done();
    });
  }


});

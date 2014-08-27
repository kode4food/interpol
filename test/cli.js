/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var fs = require('fs');
var nodeunit = require('nodeunit');
var interpol = require('../lib');
var commandLine = require('../lib/cli').commandLine;

function createConsole() {
  var buffer = [];
  var str;

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
    str = null;
  }

  function result() {
    if ( !str ) {
      str = buffer.join('\n');
    }
    return str;
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

      var content = require('./cli_success/test1.int.json');
      test.equal(typeof content, 'object');
      var compiled = interpol(content);
      test.equal(typeof compiled, 'function');
      fs.unlinkSync("./test/cli_success/test1.int.json"); // cleanup
      fs.unlinkSync("./test/cli_success/test2.int.json");
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
      fs.unlinkSync("./test/cli_warning/test1.int.json"); // cleanup
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
    commandLine(["-app", "test/test_bundle.js", "-in", "./test/cli_success"], cons, function (exitCode) {
      test.ok(cons.contains("Interpol Parsing Complete"));
      test.ok(cons.contains("Success"));
      test.ok(!cons.contains("Warnings"));
      test.ok(!cons.contains("Failures"));

      // Rewrite the file to point to the local Interpol instance
      var content = fs.readFileSync('./test/test_bundle.js').toString();
      content = content.replace("require('interpol')", "require('../lib')");
      fs.writeFileSync('./test/test_bundle.js', content);
      
      require('./test_bundle.js');
      test.ok(interpol.hasOwnProperty('test_bundle'));
      test.ok(interpol.test_bundle.hasOwnProperty('test1'));
      fs.unlinkSync("./test/test_bundle.js"); // cleanup
      test.done();
    });
  },

  "Create JSON Bundle": function (test) {
    var cons = createConsole();
    commandLine(["-json", "test/test_bundle.json", "-in", "./test/cli_success"], cons, function (exitCode) {
      test.ok(cons.contains("Interpol Parsing Complete"));
      test.ok(cons.contains("Success"));
      test.ok(!cons.contains("Warnings"));
      test.ok(!cons.contains("Failures"));
      fs.unlinkSync("./test/test_bundle.json"); // cleanup
      test.done();
    });
  }

});

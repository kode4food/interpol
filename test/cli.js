/*
 * Interpol (HTML Composition Language)
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
var createRuntime = require('../lib/runtime').createRuntime;
var createConsole = require('./helpers').createConsole;

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
    commandLine(["-in", "./test/cli_success"], cons, function () {
      test.ok(cons.contains("Interpol Parsing Complete"));
      test.ok(cons.contains("Success"));
      test.ok(!cons.contains("Warnings"));
      test.ok(!cons.contains("Failures"));

      var content = require('./cli_success/test1.int.js');
      test.equal(typeof content.createTemplate, 'function');
      var compiled = content.createTemplate(createRuntime());
      test.equal(typeof compiled, 'function');

      // cleanup
      fs.unlinkSync("./test/cli_success/test1.int.js");
      fs.unlinkSync("./test/cli_success/test2.int.js");

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
      fs.unlinkSync("./test/cli_warning/test1.int.js"); // cleanup
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

  "Create Browser Bundle": function (test) {
    var cons = createConsole();
    commandLine(["-bundle", "test/test_bundle.js", "-in", "./test/cli_success"], cons, function (exitCode) {
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
      test.equal(interpol.test_bundle.test2(), "Hello, world!");
      fs.unlinkSync("./test/test_bundle.js"); // cleanup
      test.done();
    });
  }
});

/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var nodeunit = require('nodeunit');
var interpol = require('../lib');
var resolvers = require('../lib/resolvers');
var runtime;

function evaluate(script, context) {
  var template = interpol(script, runtime);
  return template(context);
}

exports.imports = nodeunit.testCase({

  "helper imports": nodeunit.testCase({
    setUp: function (callback) {
      runtime = interpol.runtime({ resolvers: [] });
      resolvers.createMemoryResolver(runtime);
      runtime.registerModule('helpers', {
        testHelper: function testHelper(writer, arg1, arg2) {
          writer.content("arg1=" + arg1 + ":arg2=" + arg2);
        }
      });

      callback();
    },

    "Helper Import": function (test) {
      var script1 = "import helpers\n" +
        "helpers.testHelper(1,2)";

      var script2 = "from helpers import testHelper as test\n" +
        "test(5,6)";

      test.equal(evaluate(script1), "arg1=1:arg2=2");
      test.equal(evaluate(script2), "arg1=5:arg2=6");
      test.done();
    }
  }),

  "compiled and monitored": createFileImportTests(true, true),
  "compiled and cached": createFileImportTests(true, false),
  "required and monitored": createFileImportTests(false, true),
  "required and cached": createFileImportTests(false, false),

  "system imports": nodeunit.testCase({
    setUp: function (callback) {
      runtime = interpol.runtime();
      callback();
    },

    "System Import": function (test) {
      test.equal(evaluate("import math\nmath.round(9.5)"), "10");
      test.done();
    },

    "Bound System Import": function (test) {
      var script = "from list import join\n" +
        "let a = ('this', 'is', 'a', 'list')\n" +
        "let j = @join(nil, '///')\n" +
        "a | j";

      test.equal(evaluate(script), "this///is///a///list");
      test.done();
    },

    "Math Constant Import": function (test) {
      test.equal(evaluate("import math\nmath.E"), Math.E);
      test.equal(evaluate("import math\nmath.PI"), Math.PI);
      test.done();
    },

    "Missing Module Import": function (test) {
      test.throws(function () {
        evaluate("import bogus");
      }, "should throw module not resolved");
      test.done();
    }
  })
});

function createFileImportTests(compile, monitor) {
  return nodeunit.testCase({
    setUp: function (callback) {
      if ( !compile ) {
        // command-line build the files
      }
      runtime = interpol.runtime({ resolvers: [] });
      resolvers.createFileResolver(runtime, {
        path: "./test", compile: compile, monitor: monitor
      });

      callback();
    },

    tearDown: function (callback) {
      if ( !compile ) {
        // delete the generated files
      }
      callback();
    },

    "File Import": function (test) {
      var script = "import test as t\n" +
        "t.renderTest('Curly')";

      test.equal(evaluate(script), "Hello Curly\n");
      test.done();
    },

    "File Submodule Import": function (test) {
      var script1 = "import module1\nmodule1.test_value";
      var script2 = "import module2\nmodule2.test_value";
      var script3 = "import module1.index\nindex.test_value";

      test.equal(evaluate(script1), "right!");
      test.equal(evaluate(script2), "right!");
      test.equal(evaluate(script3), "wrong!");
      test.done();
    }
  });
}
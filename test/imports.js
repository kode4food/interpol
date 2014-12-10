/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var fs = require('fs');
var path = require('path');
var glob = require('glob');

var nodeunit = require('nodeunit');
var interpol = require('../lib');
var util = require('../lib/util');
var resolvers = require('../lib/resolvers');
var commandLine = require('../lib/cli').commandLine;
var createConsole = require('./helpers').createConsole;

var each = util.each;

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
      runtime.registerModule('hello', "'hello world!'");
      runtime.registerModule('helpers', {
        testHelper: function testHelper(writer, arg1, arg2) {
          writer.content("arg1=" + arg1 + ":arg2=" + arg2);
        }
      });

      callback();
    },

    tearDown: function (callback) {
      runtime.unregisterModule('helpers');
      runtime.unregisterModule('hello');
      callback();
    },

    "Helper Import": function (test) {
      var script1 = "import helpers\n" +
                    "helpers.testHelper(1,2)";

      var script2 = "from helpers import testHelper as test\n" +
                    "test(5,6)";

      var module1 = runtime.resolveModule('hello');
      var exports1 = runtime.resolveExports('hello');
      var module2 = runtime.resolveModule('helpers');
      var exports2 = runtime.resolveExports('helpers');

      test.equal(typeof module1, 'function');
      test.equal(typeof module2, 'function');
      test.equal(typeof exports1, 'object');
      test.equal(typeof exports2, 'object');
      test.equal(evaluate(script1), "arg1=1:arg2=2");
      test.equal(evaluate(script2), "arg1=5:arg2=6");
      test.throws(function () {
        runtime.registerModule(99);
      }, "Registering nonsense should explode");
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

      var list = runtime.resolveModule('list');
      var listExports = runtime.resolveExports('list');

      test.equal(typeof list, 'function');
      test.equal(typeof listExports, 'object');
      test.equal(typeof listExports.join, 'function');
      test.equal(list(), undefined);
      test.equal(listExports.first(null, 'hello'), 'hello');
      test.equal(listExports.last(null, 'hello'), 'hello');
      test.equal(listExports.length(null, 37), 0);
      test.equal(listExports.length(null, { name: 'interpol', age: 1 }), 2);
      test.done();
    },

    "Bound System Import": function (test) {
      var script = "from list import join\n" +
                   "let a = ['this', 'is', 'a', 'list']\n" +
                   "let j = @join('///')\n" +
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
      runtime = interpol.runtime({ resolvers: [] });
      resolvers.createFileResolver(runtime, {
        path: "./test", compile: compile, monitor: monitor
      });

      if ( compile ) {
        callback();
        return;
      }

      // command-line build the files
      commandLine(["-in", "./test"], createConsole(), function (exitCode) {
        callback();
      });
    },

    tearDown: function (callback) {
      if ( !compile ) {
        // delete the generated files
        var root = './test';
        var files = glob.sync('**/*.int.js', { cwd: root });
        each(files, function (file) {
          fs.unlinkSync(path.join(root, file));
        });
      }
      callback();
    },

    "Module Retrieval": function (test) {
      var result = "<!-- A Test Script -->\n<h2></h2>\n<b>There are no people!</b>\n\n";
      var found1 = runtime.resolveModule('test');
      var found2 = runtime.resolveModule('test');
      var found3 = runtime.resolveExports('test');
      var notFound1 = runtime.resolveModule('unknown');
      var notFound2 = runtime.resolveModule('unknown');
      var notFound3 = runtime.resolveExports('unknown');
      test.equal(found1(), result);
      test.equal(found2(), result);
      test.equal(typeof found3, 'object');
      test.equal(notFound1, undefined);
      test.equal(notFound2, undefined);
      test.equal(notFound3, undefined);
      test.done();
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
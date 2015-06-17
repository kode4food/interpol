/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var nodeunit = require('nodeunit');
var interpol = require('../lib');
var evaluate = interpol.evaluate;

exports.partials = nodeunit.testCase({
  setUp: function (callback) {
    callback();
  },

  "Partial Compilation": function (test) {
    var script = "def oneStatement(arg1)\n" +
                 "  if arg1 == true\n" +
                 "    'Hello'\n" +
                 "  end\n" +
                 "end\n" +
                 "oneStatement(true)";

    test.equal(evaluate(script), "Hello\n");
    test.done();
  },

  "First-Class Partials": function (test) {
    var script1 = 'def firstClass(arg1)\n' +
                  '  "Hello %arg1"\n' +
                  'end\n' +
                  'let fc = firstClass\n' +
                  'fc("Interpol")';

    var script2 = 'def v1(arg1)\n' +
                  '  "Hello %arg1"\n' +
                  'end\n' +
                  'def v2(arg1)\n' +
                  '  "Goodbye %arg1"\n' +
                  'end\n' +
                  '(v1 if coming else v2)("Interpol")';

    test.equal(evaluate(script1), "Hello Interpol\n");
    test.equal(evaluate(script2, { coming: true }), "Hello Interpol\n");
    test.equal(evaluate(script2, { coming: false }), "Goodbye Interpol\n");
    test.done();
  },

  "Guard Clauses": function (test) {
    var script = 'def partialCall(val) when val\n' +
                 '  "first %val"\n' +
                 'end\n' +
                 'def partialCall(val) where val == 10\n' +
                 '  "second %val"\n' +
                 'end\n' +
                 'def partialCall(val) when extern\n' +
                 '  "third %val"\n' +
                 'end\n' +
                 'partialCall(value)';

    test.equal(evaluate(script, { value: 20 }), "first 20\n");
    test.equal(evaluate(script, { value: 10 }), "second 10\n");
    test.equal(evaluate(script, { value: 20, extern: true }), "third 20\n");
    test.equal(evaluate(script, { value: 10, extern: true }), "third 10\n");

    test.done();
  },

  "External Guard Clauses": function (test) {
    var data = { value: 20, colors: ['red', 'black'] };

    var script = 'let val = 20\n' +
                 'def partialCall()\n' +
                 '  "first %val"\n' +
                 'end\n' +
                 'def partialCall() where val == 20\n' +
                 '  for color in colors\n' +
                 '    "%color %val"\n' +
                 '  end\n' +
                 'end\n' + 
                 'partialCall()';

    test.equal(evaluate(script, data), "red 20\nblack 20\n");
    test.done();
  },

  "Inline Guards": function (test) {
    var script = 'def partialCall(type, name)\n' +
                 '  "%name is a %type"\n' +
                 'end\n' +
                 'def partialCall("developer", name)\n' +
                 '  "%name is awesome!"\n' +
                 'end\n' +
                 'partialCall(type, name)';

    test.equal(evaluate(script, { type: "manager", name: "Bill" }),
               "Bill is a manager\n");

    test.equal(evaluate(script, { type: "developer", name: "Alice" }),
               "Alice is awesome!\n");

    test.done();
  },

  "Aliased Inline Guards": function (test) {
    var script = 'def animal("monkey" as type, name)\n' +
                 '  "I am a %type named %name"\n' +
                 'end\n' +
                 'def animal("cricket" as type, name)\n' +
                 '  "This is a %type named %name"\n' +
                 'end\n' +
                 'animal(typeVal, typeName)';

    test.equal(evaluate(script, { typeVal: "monkey", typeName: "George"}),
               "I am a monkey named George\n");

    test.equal(evaluate(script, { typeVal: "cricket", typeName: "Jim"}),
               "This is a cricket named Jim\n");

    test.done();
  },

  "toString Functionality": function (test) {
    var script1 = "def partial(arg)\n" +
                  '  "hello %arg"\n' +
                  "end\n" +
                  "partial";

    var script2 = "def partial(arg)\n" +
                  '  "hello %arg"\n' +
                  "end\n" +
                  "let bound = @partial('you')\n" +
                  "bound";
                  
    var script3 = "def partial\n" +
                  "  <b>\n" +
                  "end\n" +
                  "partial";

    var script4 = "def partial\n" +
                  "  <b>\n" +
                  "end\n" +
                  "partial + 'unsafe'";

    test.equal(evaluate(script1), "hello \n");
    test.equal(evaluate(script2), "hello you\n");
    test.equal(evaluate(script3), "<b>\n");
    test.equal(evaluate(script4), "&lt;b&gt;\nunsafe");
    test.done();
  }
});

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

  "Partial Hoisting": function (test) {
    var script1 = 'partialCall("Bob")\n' +
                  'def partialCall(name)\n' +
                  '  "Hello, %name!"\n' +
                  'end';

    var script2 = 'partialCall("Bob")\n' +
                  'def partialCall(name)\n' +
                  '  "Hello, %name!"\n' +
                  'end' +
                  'let partialCall = 50\n';

    var script3 = 'test(10)\n' +
                  'if true\n' +
                  '  def test(value) when value == 10\n' +
                  '    "first"\n' +
                  '  end\n' +
                  'end\n' +
                  'def test(value)\n' +
                  '  "second"\n' +
                  'end\n' +
                  'test(10)';

    test.equal(evaluate(script1), "Hello, Bob!\n\n");
    test.throws(function () { evaluate(script2); });
    test.throws(function () { evaluate(script3); });

    test.done();
  },

  "Guard Clauses": function (test) {
    var script = 'partialCall(value)\n' +
                 'def partialCall(val) when val\n' +
                 '  "first %val"\n' +
                 'end\n' +
                 'def partialCall(val) where val == 10\n\n' +
                 '  "second %val"\n' +
                 'end\n' +
                 'def partialCall(val) when extern\n' +
                 '  "third %val"\n' +
                 'end';

    test.equal(evaluate(script, { value: 20 }), "first 20\n\n");
    test.equal(evaluate(script, { value: 10 }), "second 10\n\n");
    test.equal(evaluate(script, { value: 20, extern: true }), "third 20\n\n");
    test.equal(evaluate(script, { value: 10, extern: true }), "third 10\n\n");

    test.done();
  },

  "Inline Guards": function (test) {
    var script = 'partialCall(type, name)\n' +
                 'def partialCall(type, name)\n' +
                 '  "%name is a %type"\n' +
                 'end\n' +
                 'def partialCall("developer", name)\n' +
                 '  "%name is awesome!"\n' +
                 'end';

    test.equal(evaluate(script, { type: "manager", name: "Bill" }),
               "Bill is a manager\n\n");

    test.equal(evaluate(script, { type: "developer", name: "Alice" }),
               "Alice is awesome!\n\n");

    test.done();
  },

  "Aliased Inline Guards": function (test) {
    var script = 'animal(typeVal, typeName)\n' +
                 'def animal("monkey" as type, name)\n' +
                 '  "I am a %type named %name"\n' +
                 'end\n' +
                 'def animal("cricket" as type, name)\n' +
                 '  "This is a %type named %name"\n' +
                 'end';

    test.equal(evaluate(script, { typeVal: "monkey", typeName: "George"}),
               "I am a monkey named George\n\n");

    test.equal(evaluate(script, { typeVal: "cricket", typeName: "Jim"}),
               "This is a cricket named Jim\n\n");

    test.done();
  }
});

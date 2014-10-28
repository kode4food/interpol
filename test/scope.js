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

exports.scope = nodeunit.testCase({
  setUp: function (callback) {
    this.globals = interpol.context();
    this.globals.greeting = "Hello, World!";

    callback();
  },

  "Shadow Global Scope": function (test) {
    test.equal(evaluate("let greeting='Not Hello!'\ngreeting"), "Not Hello!");
    test.equal(evaluate("greeting"), "Hello, World!");
    test.done();
  },

  "Shadow Local Scope": function (test) {
    var script = "let greeting = 'Not Hello'\n" +
                 "def localGreeting()\n" +
                 "  let greeting = 'Local Hello'\n" +
                 "  greeting\n" +
                 "end\n" +
                 "localGreeting() greeting";

    test.equal(evaluate(script).trim(), "Local Hello\n Not Hello");
    test.equal(evaluate("greeting"), "Hello, World!");
    test.done();
  },

  "Scope Override": function (test) {
    var script = "a\n" +
                 "let a = 'child'\n" +
                 "a";

    test.equal(evaluate(script, { a: 'parent' }), "parent\nchild");
    test.done();
  },

  "Conditional Scope": function (test) {
    var script = "a\n" +
                 "if b\n" +
                 "  let a = 'child'\n" +
                 "  a\n" +
                 "end\n" +
                 "a";

    test.equal(evaluate(script, { a: 'parent', b: true }),
               "parent\nchild\nchild");

    test.done();
  }
});

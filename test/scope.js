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
    this.globals = { greeting: "Hello, World!" };

    callback();
  },

  "Shadow Local Scope": function (test) {
    var script1 = "let greeting = 'Not Hello'\n" +
                  "def localGreeting()\n" +
                  "  greeting\n" +
                  "  let greeting = 'Local Hello'\n" +
                  "  greeting\n" +
                  "end\n" +
                  "localGreeting() greeting";

    var script2 = "let greeting = 'Not Hello'\n" +
                  "def localGreeting()\n" +
                  "  greeting\n" +
                  "  let greeting = 'Local Hello'\n" +
                  "  def evenMoreLocalGreeting()\n" +
                  "    greeting\n" +
                  "    let greeting = 'More Local Hello'\n" +
                  "    greeting\n" +
                  "  end\n" +
                  "  evenMoreLocalGreeting()\n" +
                  "end\n" +
                  "localGreeting()\n" +
                  "greeting";

    test.equal(evaluate(script2, this.globals).trim(),
               "Not Hello\nLocal Hello\nMore Local Hello\n\n\nNot Hello");
    test.equal(evaluate(script1, this.globals).trim(),
               "Not Hello\nLocal Hello\n Not Hello");
    test.equal(evaluate("greeting", this.globals), "Hello, World!");
    test.done();
  },

  "Shadow Global Scope": function (test) {
    test.equal(evaluate("let greeting='Not Hello!'\ngreeting", this.globals),
               "Not Hello!");
    test.equal(evaluate("greeting", this.globals), "Hello, World!");
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

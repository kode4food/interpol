var nodeunit = require('nodeunit');
var interpol = require('../lib');
var evaluate = interpol.evaluate;

exports.scope = nodeunit.testCase({
  setUp: function (callback) {
    this.globals = interpol.globals();
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
  }
});

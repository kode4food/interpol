var nodeunit = require('nodeunit')
  , interpol = require('../lib');

function eval(str, ctx) {
  var template = interpol(str);
  return template(ctx);
}

exports.scope = nodeunit.testCase({
  setUp: function (callback) {
    this.globals = interpol.globals();
    this.globals.greeting = "Hello, World!";

    callback();
  },

  "Shadow Global Scope": function (test) {
    test.equal(eval("let greeting='Not Hello!'\ngreeting"), "Not Hello!");
    test.equal(eval("greeting"), "Hello, World!");
    test.done();
  },

  "Shadow Local Scope": function (test) {
    var script = "let greeting = 'Not Hello'\n" +
                 "def localGreeting()\n" +
                 "  let greeting = 'Local Hello'\n" +
                 "  greeting\n" +
                 "end\n" +
                 "localGreeting() greeting";

    test.equal(eval(script).trim(), "Local Hello\n Not Hello");
    test.equal(eval("greeting"), "Hello, World!");
    test.done();
  }
});

var nodeunit = require('nodeunit')
  , interpol = require('../interpol');

function eval(str, ctx) {
  var template = interpol(str);
  return template(ctx);
}

exports.partials = nodeunit.testCase({
  setUp: function (callback) {
    callback();
  },

  "First-Class Partials": function (test) {
    var script1 = "def firstClass(arg1)\n" +
                  "  'Hello %arg1'\n" +
                  "end\n" +
                  "let fc = firstClass\n" +
                  "fc('Interpol')";

    var script2 = "def v1(arg1)\n" +
                  "  'Hello %arg1'\n" +
                  "end\n" +
                  "def v2(arg1)\n" +
                  "  'Goodbye %arg1'\n" +
                  "end\n" +
                  "(coming ? v1 : v2)('Interpol')";

    test.equal(eval(script1), "Hello Interpol\n");
    test.equal(eval(script2, { coming: true }), "Hello Interpol\n");
    test.equal(eval(script2, { coming: false }), "Goodbye Interpol\n");
    test.done();
  }
});

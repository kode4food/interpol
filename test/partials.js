var nodeunit = require('nodeunit')
  , interpol = require('../lib');

function eval(str, ctx) {
  var template = interpol(str);
  return template(ctx);
}

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

    test.equal(eval(script), "Hello\n");
    test.done();
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
  },

  "Partial Hoisting": function (test) {
    var script1 = "partialCall('Bob')\n" +
                  "def partialCall(name)\n" +
                  "  'Hello, %name!'\n" +
                  "end";

    var script2 = "partialCall('Bob')\n" +
                  "let partialCall = 50\n" +
                  "def partialCall(name)\n" +
                  "  'Hello, %name!'\n" +
                  "end";

    var script3 = "test()\n" +
                  "if true\n" +
                  "  def test(value)\n" +
                  "    'first'\n" +
                  "  end\n" +
                  "end\n" +
                  "def test(value) when value == 10\n" +
                  "  'second'\n" +
                  "end\n" +
                  "test()";

    test.equal(eval(script1), "Hello, Bob!\n\n");

    test.throws(function () {
      eval(script2);
    });

    // second is guarded, so won't evaluate
    test.equal(eval(script3), "\nfirst\n");

    test.done();
  }
});

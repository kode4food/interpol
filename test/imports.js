var nodeunit = require('nodeunit');
var interpol = require('../lib');
var evaluate = interpol.evaluate;

exports.imports = nodeunit.testCase({
  setUp: function (callback) {
    interpol.registerModule('helpers', {
      testHelper: function testHelper(writer, arg1, arg2) {
        writer.content("arg1=" + arg1 + ":arg2=" + arg2);
      }
    });

    var fileResolver = interpol.createFileResolver({
      path: "./test", compile: true, monitor: true
    });
    interpol.resolvers().push(fileResolver);

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
  }
});

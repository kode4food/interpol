var nodeunit = require('nodeunit')
  , interpol = require('../lib');

function eval(str, ctx) {
  var template = interpol(str);
  return template(ctx);
}

exports.imports = nodeunit.testCase({
  setUp: function (callback) {
    var helperResolver = interpol.helperResolver;

    helperResolver.registerHelper(function testHelper(writer, arg1, arg2) {
      writer.content("arg1=" + arg1 + ":arg2=" + arg2);
    });

    var globalResolvers = interpol.resolvers();

    var fileResolver = interpol.createFileResolver({
      path: "./test", compile: true, monitor: false
    });
    globalResolvers.push(fileResolver);

    callback();
  },

  "Helper Import": function (test) {
    var script1 = "import helpers\n" +
                  "helpers.testHelper(1,2)";

    var script2 = "from helpers import testHelper as test\n" +
                  "test(5,6)";

    test.equal(eval(script1), "arg1=1:arg2=2");
    test.equal(eval(script2), "arg1=5:arg2=6");
    test.done();
  },

  "File Import": function (test) {
    var script = "import test as t\n" +
                 "t.renderTest('Curly')";

    test.equal(eval(script), "Hello Curly\n");
    test.done();
  },

  "System Import": function (test) {
    test.equal(eval("import math\nmath.round(9.5)"), "10");
    test.done();
  },

  "Configurable System Import": function (test) {
    var script = "from array import join\n" +
                 "let a = ('this', 'is', 'an', 'array')\n" +
                 "let j = join.configure('///')\n" +
                 "a | j";

    test.equal(eval(script), "this///is///an///array");
    test.done();
  },

  "Math Constant Import": function (test) {
    test.equal(eval("import math\nmath.E"), Math.E);
    test.equal(eval("import math\nmath.PI"), Math.PI);
    test.done();
  }
});

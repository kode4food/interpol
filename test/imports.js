var nodeunit = require('nodeunit')
  , interpol = require('../interpol')
  , resolvers = require('../interpol/resolvers');

function eval(str, ctx) {
  var template = interpol(str);
  return template(ctx);
}

exports.imports = nodeunit.testCase({
  setUp: function (callback) {
    var helperResolver = resolvers.helperResolver;

    helperResolver.registerHelper(function testHelper(writer, arg1, arg2) {
      writer.content("arg1=" + arg1 + ":arg2=" + arg2);
    });

    var globalResolvers = resolvers.globalResolvers;
    globalResolvers.push(interpol.createFileResolver({ path: "./test" }));

    callback();
  },

  "Test Helper Import": function (test) {
    var script1 = "import helpers\n" +
                  "testHelper(1,2)";

    var script2 = "from helpers import testHelper as test\n" +
                  "test(5,6)";

    test.equal(eval(script1), "arg1=1:arg2=2");
    test.equal(eval(script2), "arg1=5:arg2=6");
    test.done();
  },

  "Test File Import": function (test) {
    var script = "import test\n" +
                 "renderTest('Curly')";

    test.equal(eval(script), "Hello Curly\n");
    test.done();
  }
});

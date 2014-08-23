var nodeunit = require('nodeunit');
var interpol = require('../lib');

var eval = interpol.evaluate;

exports.strings = nodeunit.testCase({
  "Escape Sequences": function (test) {
    var script1 = '"\\\\ \\" \\\' \\b \\f \\n \\r \\t"';
    var script2 = "'\\\\ \\\" \\' \\b \\f \\n \\r \\t'";
    test.equal(eval(script1), "\\ \" \' \b \f \n \r \t");
    test.equal(eval(script2), "\\ \" \' \b \f \n \r \t");
    test.done();
  },
  
  "Multi-Line, Single Quote": function (test) {
    var script1 = "'''hello\nthere'''";
    test.equal(eval(script1), "hello\nthere");
    test.done();
  }
});

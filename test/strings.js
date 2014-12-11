/*
 * Interpol (Logicful HTML Templates)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var nodeunit = require('nodeunit');
var interpol = require('../lib');
var evaluate = interpol.evaluate;

exports.strings = nodeunit.testCase({
  "Escape Sequences": function (test) {
    var script1 = '"\\\\ \\" \\\' \\b \\f \\n \\r \\t"';
    var script2 = "'\\\\ \\\" \\' \\b \\f \\n \\r \\t'";
    test.equal(evaluate(script1), "\\ \" \' \b \f \n \r \t");
    test.equal(evaluate(script2), "\\ \" \' \b \f \n \r \t");
    test.done();
  },
  
  "Multi-Line, Single Quote": function (test) {
    var script1 = "'''hello\nthere'''";
    test.equal(evaluate(script1), "hello\nthere");
    test.done();
  },
  
  "Functions": function (test) {
    var script1 = "from string import lower\nlower('CAP STRING')";
    var script2 = "from string import split\nsplit('1\\n2\\n3')[2]";
    var script3 = "from string import split\nsplit('-', '1-2-3')[1]";
    var script4 = "from string import build\nbuild(template)([name='Bob'])";
    test.equal(evaluate(script1), "cap string");
    test.equal(evaluate(script2), "3");
    test.equal(evaluate(script3), "2");
    test.equal(evaluate(script4, { template: "Name: %name" }), "Name: Bob");
    test.done();
  }
});

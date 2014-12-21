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

exports.loops = nodeunit.testCase({
  setUp: function (callback) {
    this.data = {
      "name": "World",
      "title": "Famous People",
      "dogs_lbl": "Furthermore, %3 are the new %",
      "hello_lbl": "Hello, %name!",
      "people" : [
        { "name": "Larry", "age": 50, "brothers": [] },
        { "name": "Curly", "age": 45, "brothers": ["Moe", "Shemp"]},
        { "name": "Moe", "age": 58, "brothers": ["Curly", "Shemp"]}
      ]
    };

    callback();
  },

  "Basic Loops": function (test) {
    var script1 = 'for color in ["red", "green", "blue"]\n' +
                  'when color != "red"\n' +
                  '  "%color is a color\n"' +
                  'end';

    var script2 = 'for color in []\n' +
                  '  "%color is a color"\n' +
                  'else\n' +
                  '  "No Colors"\n' +
                  'end';

    var script3 = 'for color in 97\n' +
                  '  "%color is a color"\n' +
                  'end';

    var script4 = 'for pair in [name="Thom", age=42]\n' +
                  '  "%name=%value"(pair)\n' +
                  'end';

    var script5 = 'for person in people, brother in person.brothers\n' +
                  '  let name = person.name\n' +
                  '  "%name-%brother"\n' +
                  'end';

    var script6 = 'for person in people\n' +
                  '  for brother in person.brothers\n' +
                  '    [name=person.name, brother=brother] | "%name-%brother"\n' +
                  '  end\n' +
                  'end';

    var script7 = 'for person in people\n' +
                  '  for brother in person.brothers\n' +
                  '    [name=person.name, brother=brother] | "%name-%brother"\n' +
                  '  else\n' +
                  '    "-"\n' +
                  '  end\n' +
                  'end';

    test.equal(evaluate(script1), "green is a color\nblue is a color\n");
    test.equal(evaluate(script2), "No Colors\n");
    test.equal(evaluate(script3), "");
    test.equal(evaluate(script4), "name=Thom\nage=42\n");
    test.equal(evaluate(script5, this.data),
               "Curly-Moe\nCurly-Shemp\nMoe-Curly\nMoe-Shemp\n");
    test.equal(evaluate(script6, this.data),
               "Curly-Moe\nCurly-Shemp\nMoe-Curly\nMoe-Shemp\n");
    test.equal(evaluate(script7, this.data),
               "-\nCurly-Moe\nCurly-Shemp\nMoe-Curly\nMoe-Shemp\n");
    test.done();
  },
  
  "Generator Loops": function (test) {
    var script1 = "from math import range\nfor i in range(1, 10)\ni\nend";
    var script2 = "from math import range\nfor i in range(10, 2)\ni\nend";
    var script3 = "from math import range\nfor i in range(5, -5)\ni\nend";
    var script4 = "from math import range\nfor i in range(0, 0)\ni\nend";
    var script5 = "from math import range\nfor i in range(0.5, 10.1)\ni\nend";
    var script6 = "from math import range\n[i * 2 for i in range(1,10)]";
    
    test.equal(evaluate(script1), "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n");
    test.equal(evaluate(script2), "10\n9\n8\n7\n6\n5\n4\n3\n2\n");
    test.equal(evaluate(script3), "5\n4\n3\n2\n1\n0\n-1\n-2\n-3\n-4\n-5\n");
    test.equal(evaluate(script4), "0\n");
    test.equal(evaluate(script5), "0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n");
    test.equal(evaluate(script6), "2 4 6 8 10 12 14 16 18 20");
    test.done();
  }
});

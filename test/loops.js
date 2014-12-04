/*
 * Interpol (Templates Sans Facial Hair)
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
  }
});

/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var nodeunit = require('nodeunit');
var interpol = require('../lib');
var evaluate = interpol.evaluate;

exports.like = nodeunit.testCase({
  "Like Matching": function (test) {
    var person1 = {
      "name": "Thom",
      "age": 42,
      "job": "Developer",
      "colors": ["red", "green", "blue"]
    };

    var person2 = {
      "name": "Thom",
      "age": 42,
      "colors": ["red", "green", "blue"]
    };

    var person3 = {
      "name": "Thom",
      "age": 42,
      "colors": ["red", "green", "yellow"]
    };

    var person4 = {
      "name": "Thom",
      "colors": ["red", "blue"]
    };

    var array = ["red", "green", "blue"];

    var data = {
      person1: person1,
      person2: person2,
      person3: person3,
      person4: person4,
      array: array,
      null_value: null
    };

    var script1 = 'if person1 like person2\n' +
                  '  "They match!"\n' +
                  'end';

    var script2 = 'unless person1 like person3\n' +
                  '  "They don\'t match!"\n' +
                  'end';

    var script3 = 'unless person1 like person4\n' +
                  '  "They don\'t match!"\n' +
                  'end';

    var script4 = 'if array like ["red", "green", "blue"]\n' +
                  '  "They match!"\n' +
                  'else\n' +
                  '  "They don\'t match!"\n' +
                  'end';

    var script5 = 'unless person1 like [name = "Thom", age = 56]\n' +
                  '  "They don\'t match!"\n' +
                  'end';

    test.equal(evaluate(script1, data), "They match!\n");
    test.equal(evaluate(script1, { person1: null }), "They match!\n");
    test.equal(evaluate(script2, data), "They don't match!\n");
    test.equal(evaluate(script3,
              { person1: person1, person3: 88 }),
              "They don't match!\n");
    test.equal(evaluate(script3, data), "They don't match!\n");
    test.equal(evaluate(script4, data), "They match!\n");
    test.equal(evaluate(script4, { array: [] }), "They don't match!\n");
    test.equal(evaluate(script4, { array: ['blue', 'white', 'green'] }),
              "They don't match!\n");
    test.equal(evaluate(script5, data), "They don't match!\n");
    test.equal(evaluate(script5, { person1: null }), "They don't match!\n");
    
    test.equal(evaluate("nil like null_value", data), "true");
    test.equal(evaluate("null_value like nil", data), "true");

    test.done();
  }
});

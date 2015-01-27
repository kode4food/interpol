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

exports.calls = nodeunit.testCase({
  setUp: function (callback) {
    this.data = {
      "name": ["title", "case"],
      "people": [
        { name: 'Bill', age: 19 },
        { name: 'Fred', age: 42 },
        { name: 'Bob', age: 99 }
      ]
    };

    callback();
  },

  "Left Calls": function (test) {
    var script1 = 'from string import title\n' +
                  'from list import join\n' +
                  'let formatted = title(join(name))\n' +
                  '"Hello, %formatted!"';

    test.equal(evaluate(script1, this.data), "Hello, Title Case!");

    test.done();
  },

  "Right Calls": function (test) {
    var script1 = 'from string import title\n' +
                  'from list import join\n' +
                  'let formatted = name | join | title\n' +
                  '"Hello, %formatted!"';

    test.equal(evaluate(script1, this.data), "Hello, Title Case!");

    test.done();
  },
  
  "'do' Calls": function (test) {
    var script1 = 'def renderList(items, renderer)\n' +
                  '  for item in items\n' +
                  '    renderer(item)\n' +
                  '  end\n' +
                  'end\n' +
                  'renderList(people) do |item|\n' +
                  '  item | "name is %name and age is %age"\n' +
                  'end';
    
    var script2 = 'def header(block)\n' +
                  '  <h1> block </h1>\n' +
                  'end\n' +
                  'header do\n' +
                  '  "hello there"\n' +
                  'end';
    
    var script3 = 'def classyHeader(classes, block)\n' +
                  '  <h1 class=classes> block </h1>\n' +
                  'end\n' +
                  'classyHeader(["title"]) do\n' +
                  '  "hello there"\n' +
                  'end';
    
    test.equal(evaluate(script1, this.data),
               "name is Bill and age is 19\n\n" +
               "name is Fred and age is 42\n\n" +
               "name is Bob and age is 99\n\n");

    test.equal(evaluate(script2), "<h1> hello there\n </h1>\n");
    test.equal(evaluate(script3), "<h1 class=\"title\"> hello there\n </h1>\n");
    
    test.done();
  }
});

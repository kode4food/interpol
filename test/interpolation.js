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

exports.interpolation = nodeunit.testCase({
  setUp: function (callback) {
    this.data = {
      "name": "World",
      "some_array": ['title', 'case', 'string'],
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

  "Interpolation Operator": function (test) {
    var script = "let a = ['red', 'black']\n" +
                 "let b = '% is the new %'\n" +
                 'a | b';

    test.equal(evaluate(script), "red is the new black");
    test.equal(evaluate("['red', 'black'] | '% is the new %'"),
               "red is the new black");
    test.equal(evaluate("'%1 is the new %0'(['red', 'black'])"),
               "black is the new red");

    test.throws(function () {
      evaluate("dogs_lbl('red', 'cats', 'dogs')", this.data);
    }, "can't interpolate external data");

    test.done();
  },

  "Automatic Interpolation": function (test) {
    test.equal(evaluate("'%% %%%% % %% %%%%%% %'"), "%% %%%% % %% %%%%%% %");
    test.equal(evaluate('"%% %%%% % %% %%%%%% %"'), "% %%  % %%% ");
    test.equal(evaluate("self | '%% %%%% % %% %%%%%% %'"), "% %%  % %%% ");
    test.equal(evaluate('"Hello, %name!"', { name: 'World'}), "Hello, World!");
    test.equal(evaluate('"""Hello\n%name!"""', { name: 'World'}), "Hello\nWorld!");
    test.equal(evaluate('"Hello, %name! %"', { name: 'World'}), "Hello, World! ");
    test.equal(evaluate("'Hello, %name! %'", { name: 'Wordl'}), "Hello, %name! %");
    test.equal(evaluate('"%% %name"', { name: 'World'}), "% World");
    test.equal(evaluate('"This % will interpolate badly"'),
               "This  will interpolate badly");
    test.equal(evaluate('"the answer is %val%% (percent)"', { val: 88 }),
               "the answer is 88% (percent)");
    test.done();
  },

  "List Interpolation": function (test) {
    test.equal(evaluate("'%name is %age'[name='Bill',age=20]"),
               "Bill is 20");

    test.done();
  },

  "Piped Interpolation": function (test ) {
    var script1 = 'from string import title\n' +
                  'from list import join\n' +
                  '"Result is %some_array|join|title"';

    var script2 = 'from string import upper\n' +
                  '"The Title is %|upper"("big")';

    test.equal(evaluate(script1, this.data), "Result is Title Case String");
    test.equal(evaluate(script2, this.data), "The Title is BIG");
    test.done();
  },

  "Mixed Interpolation": function (test) {
    var script = "let val2 = 'test2'\n" +
                 "def part('test3', val4)\n" +
                 '  "%val1 %val4 %val2 %0"\n' +
                 "end\n" +
                 "part(val3, 'test4')";

    test.equal(evaluate(script, { val1: 'test1', val3: 'test3' }),
               "test1 test4 test2 test3\n");
    test.done();
  }
});

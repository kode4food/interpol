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

exports.lists = nodeunit.testCase({
  "Expression lists": function (test) {
    test.equal(evaluate("[9,8,'Hello',7,3][2]"), "Hello");
    test.equal(evaluate("[9,8,'Hello',7,3].length"), 5);
    test.equal(evaluate("[3 * 3, 2 * 4, 'Hel'+'lo', 14 / 2, 9 / 3][2]"), "Hello");
    test.equal(evaluate("(1000).length"), "");
    test.equal(evaluate("[1000].length"), "1");
    test.done();
  },

  "Dictionary lists": function (test) {
    test.equal(evaluate("[name='Thom',age=42].age"), "42");
    test.equal(evaluate("[name='Thom',age=21*2].age"), "42");
    test.equal(evaluate("[age=21*2].age"), "42");
    test.done();
  },

  "Nested lists": function (test) {
    var base = "[" +
               "  name   = 'World'," +
               "  title  = 'Famous People', " +
               "  people = [" +
               "    [ name = 'Larry', age = 50 ]," +
               "    [ name = 'Curly', age = 45 ]," +
               "    [ name = 'Moe', age = 58 ]" +
               "  ]" +
               "]";

    test.equal(evaluate(base + ".title"), "Famous People");
    test.equal(evaluate(base + ".people[1].name"), "Curly");
    test.equal(evaluate(base + ".people.length"), "3");
    test.done();
  },

  "Functions": function (test) {
    test.equal(evaluate("import list\nlist.join(['this','is','interpol'])"),
                        "this is interpol");

    test.equal(evaluate("import list\nlist.join(['this','is','interpol'], '-=-')"),
                        "this-=-is-=-interpol");

    test.equal(evaluate("import list\nlist.join('hello', '-=-')"), "hello");

    test.equal(evaluate("import list\nlist.first([1,2,3])"), "1");
    test.equal(evaluate("import list\nlist.first([9])"), "9");

    test.equal(evaluate("import list\nlist.last([1,2,3])"), "3");
    test.equal(evaluate("import list\nlist.last([])"), "");
    test.equal(evaluate("import list\nlist.last([9])"), "9");

    test.equal(evaluate("import list\nlist.length([1,2,3])"), "3");
    test.equal(evaluate("import list\nlist.length([9])"), "1");

    test.equal(evaluate("import list\nlist.empty([1,2,3])"), "false");
    test.equal(evaluate("import list\nlist.empty([])"), "true");
    test.equal(evaluate("import list\nlist.empty(9)"), "true");

    test.equal(evaluate("import list\nlist.keys([name='Thom',age=42])"),
               "name age");
    test.equal(evaluate("import list\nlist.keys(62)"), "");

    test.equal(evaluate("import list\nlist.values([name='Thom',age=42])"),
               "Thom 42");
    test.equal(evaluate("import list\nlist.values(62)"), "");

    test.done();
  },

  "Expression Keys": function (test) {
    var data = {
      name: 'hello',
      value: 9,
      blessed: interpol.bless('isBlessed')
    };

    test.equal(evaluate("[(name + '1') = value + 1]['hello1']", data), "10");
    test.equal(evaluate("[(blessed) = value]['isBlessed']", data), "9");

    test.done();
  }
});

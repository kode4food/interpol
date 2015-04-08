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

exports.basics = nodeunit.testCase({
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

  "Entry Point": function (test) {
    test.throws(function() { interpol(47); });
    test.done();
  },

  "Relational Evaluation": function (test) {
    test.equal(evaluate("10 * 99 gt 900"), "true");
    test.equal(evaluate("100 / 5 ge 30"), "false");
    test.equal(evaluate("100 / 5 gte 30"), "false");
    test.equal(evaluate("99 mod 6 ge 3"), "true");
    test.equal(evaluate("33 * 3 mod 6 le 2"), "false");
    test.equal(evaluate("33 * 3 mod 6 lte 2"), "false");
    test.equal(evaluate("people[0].age * 2 gt 99", this.data), "true");
    test.equal(evaluate("people[0].age / 2 lt 24", this.data), "false");
    test.equal(evaluate("100 / people[0].age ge 2", this.data), "true");
    test.equal(evaluate("3 * people[0].age le 149", this.data), "false");
    test.done();
  },

  "Equality Evaluation": function (test) {
    test.equal(evaluate("10 * 99 == 990"), "true");
    test.equal(evaluate("100 / 5 != 19"), "true");
    test.equal(evaluate("99 mod 6 == 3"), "true");
    test.equal(evaluate("33 * 3 mod 6 != 2"), "true");
    test.equal(evaluate("people[0].age * 2 == 99", this.data), "false");
    test.equal(evaluate("people[0].age / 2 != 25", this.data), "false");
    test.equal(evaluate("100 / people[0].age == 2", this.data), "true");
    test.equal(evaluate("3 * people[0].age != 149", this.data), "true");
    test.done();
  },

  "Boolean Or/And Evaluation": function (test) {
    test.equal(evaluate("true and false"), "false");
    test.equal(evaluate("true or false"), "true");
    test.equal(evaluate("people[0].age * 2 == 100 and 'yep'", this.data), "yep");
    test.equal(evaluate("people[0].age * 2 == 99 or 'nope'", this.data), "nope");
    test.equal(evaluate("'yep' and people[0].age * 2", this.data), "100");
    test.equal(evaluate("'yep' or people[0].age * 2", this.data), "yep");
    test.equal(evaluate("false or people[0].age * 2", this.data), "100");
    test.equal(evaluate("not true and not false"), "false");
    test.equal(evaluate("not(true or false)"), "false");
    test.equal(evaluate("not true or not false"), "true");
    test.equal(evaluate("not(true and false)"), "true");
    test.done();
  },

  "Unary Evaluation": function (test) {
    test.equal(evaluate("-1"), "-1");
    test.equal(evaluate("not false"), "true");
    test.equal(evaluate("not true"), "false");
    test.equal(evaluate("not (----10 - 10)"), "true");
    test.equal(evaluate("-people[0].age", this.data), "-50");
    test.equal(evaluate("-people[0].age + 10", this.data), "-40");
    test.equal(evaluate("not (people[0].age == 25)", this.data), "true");
    test.done();
  },

  "Nil Evaluation": function (test ) {
    test.equal(evaluate("true == nil"), "false");
    test.equal(evaluate("nil != nil"), "false");
    test.equal(evaluate("nil == nil"), "true");
    test.equal(evaluate("bogusValue != nil"), "false");
    test.equal(evaluate("bogusValue == nil"), "true");
    test.done();
  },

  "Conditional Evaluation": function (test) {
    var script = "'cond1' if cond1 else " +
                 "'cond2' if cond2 else " +
                 "'cond4' unless cond3 else 'cond3'";

    test.equal(evaluate(script, {cond1: true}), "cond1");
    test.equal(evaluate(script, {cond2: true}), "cond2");
    test.equal(evaluate(script, {cond3: true}), "cond3");
    test.equal(evaluate(script), "cond4");
    test.done();
  },

  "Dictionary Like": function (test) {
    var data = {
      person: {
        name: "Thom",
        age: 42,
        title: "Developer"
      }
    };

    var script1 = 'if person like [name = "Thom", age = 42]\n' +
                  '  person | "%name is %age"\n' +
                  'end';

    var script2 = 'if person like [name = "Thom", age = 42]\n' +
                  '  "%name is %age"(person)\n' +
                  'end';

    test.equal(evaluate(script1, data), "Thom is 42\n");
    test.equal(evaluate(script2, data), "Thom is 42\n");
    test.done();
  },
   
  "Vector Like": function (test) {
    var script1 = '[1, 2, 3] like [1, 2]';
    var script2 = '[1, 2, 3] like [1, 2, 3]';
    var script3 = '[1, 2] like [1, 2, 3]';
    var script4 = '[] like []';

    test.equal(evaluate(script1), "true");
    test.equal(evaluate(script2), "true");
    test.equal(evaluate(script3), "false");
    test.equal(evaluate(script4), "true");
    test.done();
  },

  "Blessed Strings": function (test) {
    var data = {
      rawString: interpol.bless("<b>it's bold!</b>"),
      escapedString: "<b>it's not bold!</b>"
    };

    test.equal(evaluate("rawString", data), "<b>it's bold!</b>");

    test.equal(evaluate("escapedString", data),
               "&lt;b&gt;it's not bold!&lt;/b&gt;");

    test.done();
  },

  "Deep Paths": function (test) {
    var data = {
      root: [{
        colors: ['red', 'green', 'blue'],
        info: {
          description: "this is a description"
        }
      }]
    };

    test.equal(evaluate("root[0].colors[1]", data), "green");
    test.equal(evaluate("root[0].info.description", data), "this is a description");
    test.equal(evaluate("root[0].info['description']", data), "this is a description");
    test.equal(evaluate("root[1].info['description']", data), "");
    test.equal(evaluate("root[0].info.notThere", data), "");
    test.done();
  },

  "Assignments": function (test) {
    test.equal(evaluate("let a = 99\na"), "99");
    test.equal(evaluate("let a = 99, b = 1000\na b"), "99 1000");
    test.equal(evaluate("let a = 100, b = a + 20, c = b * 2\nc"), "240");
    test.done();
  }
});

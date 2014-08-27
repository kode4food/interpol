var nodeunit = require('nodeunit');
var interpol = require('../lib');

function evaluate(str, ctx) {
  var template = interpol(str);
  return template(ctx);
}

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
    test.equal(evaluate("99 mod 6 ge 3"), "true");
    test.equal(evaluate("33 * 3 mod 6 le 2"), "false");
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

  "Like Evaluation": function (test) {
    var data = {
      person: {
        name: "Thom",
        age: 42,
        title: "Developer"
      }
    };

    var script = 'if person like (name = "Thom", age = 42)\n' +
                 '  "%name is %age" % person\n' +
                 'end';

    test.equal(evaluate(script, data), "Thom is 42\n");
    test.done();
  }
});

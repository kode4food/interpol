var nodeunit = require('nodeunit')
  , interpol = require('../lib');

function eval(str, ctx) {
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

  "Arithmetic Evaluation": function (test) {
    test.equal(eval("1 + 1"), "2");
    test.equal(eval("10 - 7"), "3");
    test.equal(eval("10 + 30 - 5"), "35");
    test.equal(eval("people[0].age + 10", this.data), "60");
    test.equal(eval("60 - people[0].age", this.data), "10");
    test.done();
  },

  "Multiplicative Evaluation": function (test) {
    test.equal(eval("10 * 99"), "990");
    test.equal(eval("100 / 5"), "20");
    test.equal(eval("99 mod 6"), "3");
    test.equal(eval("33 * 3 mod 6"), "3");
    test.equal(eval("people[0].age * 2", this.data), "100");
    test.equal(eval("people[0].age / 2", this.data), "25");
    test.equal(eval("100 / people[0].age", this.data), "2");
    test.equal(eval("3 * people[0].age", this.data), "150");
    test.equal(eval("(33 * 6 - (people[0].age + 1)) mod 6", this.data), "3");
    test.done();
  },

  "Relational Evaluation": function (test) {
    test.equal(eval("10 * 99 gt 900"), "true");
    test.equal(eval("100 / 5 ge 30"), "false");
    test.equal(eval("99 mod 6 ge 3"), "true");
    test.equal(eval("33 * 3 mod 6 le 2"), "false");
    test.equal(eval("people[0].age * 2 gt 99", this.data), "true");
    test.equal(eval("people[0].age / 2 lt 24", this.data), "false");
    test.equal(eval("100 / people[0].age ge 2", this.data), "true");
    test.equal(eval("3 * people[0].age le 149", this.data), "false");
    test.done();
  },

  "Equality Evaluation": function (test) {
    test.equal(eval("10 * 99 == 990"), "true");
    test.equal(eval("100 / 5 != 19"), "true");
    test.equal(eval("99 mod 6 == 3"), "true");
    test.equal(eval("33 * 3 mod 6 != 2"), "true");
    test.equal(eval("people[0].age * 2 == 99", this.data), "false");
    test.equal(eval("people[0].age / 2 != 25", this.data), "false");
    test.equal(eval("100 / people[0].age == 2", this.data), "true");
    test.equal(eval("3 * people[0].age != 149", this.data), "true");
    test.done();
  },

  "Boolean Or/And Evaluation": function (test) {
    test.equal(eval("true and false"), "false");
    test.equal(eval("true or false"), "true");
    test.equal(eval("people[0].age * 2 == 100 and 'yep'", this.data), "yep");
    test.equal(eval("people[0].age * 2 == 99 or 'nope'", this.data), "nope");
    test.equal(eval("'yep' and people[0].age * 2", this.data), "100");
    test.equal(eval("'yep' or people[0].age * 2", this.data), "yep");
    test.equal(eval("false or people[0].age * 2", this.data), "100");
    test.done();
  },

  "Unary Evaluation": function (test) {
    test.equal(eval("-1"), "-1");
    test.equal(eval("not false"), "true");
    test.equal(eval("not true"), "false");
    test.equal(eval("not (----10 - 10)"), "true");
    test.equal(eval("-people[0].age", this.data), "-50");
    test.equal(eval("-people[0].age + 10", this.data), "-40");
    test.equal(eval("not (people[0].age == 25)", this.data), "true");
    test.done();
  },

  "Nil Evaluation": function (test ) {
    test.equal(eval("true == nil"), "false");
    test.equal(eval("nil != nil"), "false");
    test.equal(eval("nil == nil"), "true");
    test.equal(eval("bogusValue != nil"), "false");
    test.equal(eval("bogusValue == nil"), "true");
    test.done();
  },

  "Conditional Evaluation": function (test) {
    var script = "'cond1' if cond1 else " +
                 "'cond2' if cond2 else " +
                 "'cond4' unless cond3 else 'cond3'";

    test.equal(eval(script, {cond1: true}), "cond1");
    test.equal(eval(script, {cond2: true}), "cond2");
    test.equal(eval(script, {cond3: true}), "cond3");
    test.equal(eval(script), "cond4");
    test.done();
  }
});

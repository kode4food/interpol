var nodeunit = require('nodeunit');
var interpol = require('../lib');
var eval = interpol.evaluate;

exports.math = nodeunit.testCase({
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

  "Numbers": function (test) {
    test.equal(eval("1.2E5"), "120000");
    test.equal(eval("1.2e+10"), "12000000000");
    test.equal(eval("1.5e-5"), "0.000015");
    test.equal(eval("-1.8e-2"), "-0.018");
    test.done();
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
  }
});

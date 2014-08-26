var nodeunit = require('nodeunit');
var interpol = require('../lib');
var evaluate = interpol.evaluate;

exports.codepaths = nodeunit.testCase({
  setUp: function (callback) {
    this.data = {
      low_number: 12,
      high_number: 20,
      true_val: true,
      false_val: false
    };

    callback();
  },

  "No Literals": function (test) {
    test.equals(evaluate("low_number lt high_number", this.data), "true");
    test.equals(evaluate("low_number le high_number", this.data), "true");
    test.equals(evaluate("high_number gt low_number", this.data), "true");
    test.equals(evaluate("high_number ge low_number", this.data), "true");
    test.equals(evaluate("low_number == low_number", this.data), "true");
    test.equals(evaluate("high_number != low_number", this.data), "true");
    test.equals(evaluate("low_number + high_number", this.data), "32");
    test.equals(evaluate("high_number - low_number", this.data), "8");
    test.equals(evaluate("high_number * low_number", this.data), "240");
    test.equals(evaluate("high_number / low_number", this.data), "1.6666666666666667");
    test.equals(evaluate("high_number like high_number", this.data), "true");
    test.equals(evaluate("high_number mod low_number", this.data), "8");
    test.equals(evaluate("true_val and true_val", this.data), "true");
    test.equals(evaluate("false_val or true_val", this.data), "true");
    test.done();
  },

  "Left Literal": function (test) {
    test.equals(evaluate("12 lt high_number", this.data), "true");
    test.equals(evaluate("12 le high_number", this.data), "true");
    test.equals(evaluate("20 gt low_number", this.data), "true");
    test.equals(evaluate("20 ge low_number", this.data), "true");
    test.equals(evaluate("12 == low_number", this.data), "true");
    test.equals(evaluate("20 != low_number", this.data), "true");
    test.equals(evaluate("12 + high_number", this.data), "32");
    test.equals(evaluate("20 - low_number", this.data), "8");
    test.equals(evaluate("20 * low_number", this.data), "240");
    test.equals(evaluate("20 / low_number", this.data), "1.6666666666666667");
    test.equals(evaluate("20 like high_number", this.data), "true");
    test.equals(evaluate("20 mod low_number", this.data), "8");
    test.equals(evaluate("true and true_val", this.data), "true");
    test.equals(evaluate("false or true_val", this.data), "true");
    test.done();
  },

  "Right Literal": function (test) {
    test.equals(evaluate("low_number lt 20", this.data), "true");
    test.equals(evaluate("low_number le 20", this.data), "true");
    test.equals(evaluate("high_number gt 12", this.data), "true");
    test.equals(evaluate("high_number ge 12", this.data), "true");
    test.equals(evaluate("low_number == 12", this.data), "true");
    test.equals(evaluate("high_number != 12", this.data), "true");
    test.equals(evaluate("low_number + 20", this.data), "32");
    test.equals(evaluate("high_number - 12", this.data), "8");
    test.equals(evaluate("high_number * 12", this.data), "240");
    test.equals(evaluate("high_number / 12", this.data), "1.6666666666666667");
    test.equals(evaluate("high_number like 20", this.data), "true");
    test.equals(evaluate("high_number mod 12", this.data), "8");
    test.equals(evaluate("true_val and true", this.data), "true");
    test.equals(evaluate("false_val or true", this.data), "true");
    test.done();
  },

  "Both Literals": function (test) {
    test.equals(evaluate("12 lt 20", this.data), "true");
    test.equals(evaluate("12 le 20", this.data), "true");
    test.equals(evaluate("20 gt 12", this.data), "true");
    test.equals(evaluate("20 ge low_number", this.data), "true");
    test.equals(evaluate("12 == 12", this.data), "true");
    test.equals(evaluate("20 != 12", this.data), "true");
    test.equals(evaluate("12 + 20", this.data), "32");
    test.equals(evaluate("20 - 12", this.data), "8");
    test.equals(evaluate("20 * 12", this.data), "240");
    test.equals(evaluate("20 / 12", this.data), "1.6666666666666667");
    test.equals(evaluate("20 like 20", this.data), "true");
    test.equals(evaluate("20 mod 12", this.data), "8");
    test.equals(evaluate("true and true", this.data), "true");
    test.equals(evaluate("false or true", this.data), "true");
    test.done();
  }
});

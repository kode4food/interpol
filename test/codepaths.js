var nodeunit = require('nodeunit');
var interpol = require('../lib');
var evaluate = interpol.evaluate;

exports.codepaths = nodeunit.testCase({
  setUp: function (callback) {
    this.data = {
      low_number: 12,
      high_number: 20,
      true_val: true,
      false_val: false,
      nil_value: null,
      obj_value: {
        name: 'Thom',
        age: 42
      },
      name_key: "name",
      missing_key: "missing"
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
    test.equals(evaluate("false_val and true_val", this.data), "false");
    test.equals(evaluate("false_val or true_val", this.data), "true");
    test.equals(evaluate("true_val or false_val", this.data), "true");
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
    test.equals(evaluate("false and true_val", this.data), "false");
    test.equals(evaluate("false or true_val", this.data), "true");
    test.equals(evaluate("true or false_val", this.data), "true");
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
    test.equals(evaluate("false_val and true", this.data), "false");
    test.equals(evaluate("false_val or true", this.data), "true");
    test.equals(evaluate("true_val or false", this.data), "true");
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
    test.equals(evaluate("false and true", this.data), "false");
    test.equals(evaluate("false or true", this.data), "true");
    test.equals(evaluate("true or false", this.data), "true");
    test.done();
  },

  "Conditional": function (test) {
    test.equals(evaluate("true if true else false", this.data), "true");
    test.equals(evaluate("true if true_val else false", this.data), "true");
    test.equals(evaluate("true if true else false_val", this.data), "true");
    test.equals(evaluate("true if true_val else false_val", this.data), "true");
    test.equals(evaluate("true_val if true else false", this.data), "true");
    test.equals(evaluate("true_val if true_val else false", this.data), "true");
    test.equals(evaluate("true_val if true else false_val", this.data), "true");
    test.equals(evaluate("true_val if true_val else false_val", this.data), "true");

    test.equals(evaluate("true if false else false", this.data), "false");
    test.equals(evaluate("true if false_val else false", this.data), "false");
    test.equals(evaluate("true if false else false_val", this.data), "false");
    test.equals(evaluate("true if false_val else false_val", this.data), "false");
    test.equals(evaluate("true_val if false else false", this.data), "false");
    test.equals(evaluate("true_val if false_val else false", this.data), "false");
    test.equals(evaluate("true_val if false else false_val", this.data), "false");
    test.equals(evaluate("true_val if false_val else false_val", this.data), "false");

    test.done();
  },

  "Membership": function (test) {
    test.equals(evaluate("nil.missing"), "");
    test.equals(evaluate("nil_value.missing", this.data), "");
    test.equals(evaluate("nil_value[nil_value]", this.data), "");
    test.equals(evaluate("nil[nil_value]", this.data), "");
    test.equals(evaluate("obj_value.name", this.data), "Thom");
    test.equals(evaluate("obj_value['name']", this.data), "Thom");
    test.equals(evaluate("obj_value[name_key]", this.data), "Thom");
    test.equals(evaluate("obj_value.missing", this.data), "");
    test.equals(evaluate("obj_value[missing_key]", this.data), "");

    test.done();
  },

  "Truthy": function (test) {
    test.equals(evaluate("if (1,2,3)\ntrue\nend"), "true\n");
    test.equals(evaluate("unless ()\ntrue\nend"), "true\n");
    test.done();
  }
});

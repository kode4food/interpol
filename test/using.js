var nodeunit = require('nodeunit')
  , interpol = require('../lib');

function eval(str, ctx) {
  var template = interpol(str);
  return template(ctx);
}

exports.using = nodeunit.testCase({
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

  "'Using' Evaluation": function (test) {
    var script1 = 'let b = (name = "Frog")\n' +
                  'using b\n' +
                  '  "Hello, %name!"\n' +
                  'end';

    test.equal(eval(script1), "Hello, Frog!\n");
    test.done();
  }
});

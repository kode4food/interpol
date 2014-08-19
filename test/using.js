var nodeunit = require('nodeunit');
var interpol = require('../lib');

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

    var script2 = 'let b = (name = "Doggy")\n' +
                  'let c = (name = "Frog")\n' +
                  'test(b)\n' +
                  'def test(d)\n' +
                  '  using b, c, d\n' +
                  '    "Hello, %name!"\n' +
                  '  end\n' +
                  'end';

    test.equal(eval(script1), "Hello, Frog!\n");
    test.equal(eval(script2), "Hello, Doggy!\n\n");
    test.done();
  },

  "Using Expressions": function (test) {
    var script1 = 'let a = (name = "Thom", age = 42)\n' +
                  '"%name is %age" using a';

    var script2 = 'let name = "Thom"\n' +
                  'let b = (age = 42)\n' +
                  'let c = (job = "Developer")\n' +
                  '"%name is %age and is a %job" using b, c';

    test.equal(eval(script1), "Thom is 42");
    test.equal(eval(script2), "Thom is 42 and is a Developer");
    test.done();
  }
});

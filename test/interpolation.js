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
    test.equal(evaluate("'% is the new %' % ('red', 'black')"),
               "red is the new black");
    test.equal(evaluate("'%2 is the new %1' % ('red', 'black')"),
               "black is the new red");
    test.equal(evaluate("dogs_lbl % ('red', 'cats', 'dogs')", this.data),
               "Furthermore, dogs are the new cats");
    test.done();
  },

  "Automatic Interpolation": function (test) {
    test.equal(evaluate('"%% %%%% % %% %%%%%% %"'), "%% %%%% % %% %%%%%% %");
    test.equal(evaluate("'%% %%%% % %% %%%%%% %' % self"), "% %%  % %%% ");
    test.equal(evaluate('"Hello, %name!"', { name: 'World'}), "Hello, World!");
    test.equal(evaluate('"""Hello\n%name!"""', { name: 'World'}), "Hello\nWorld!");
    test.equal(evaluate('"Hello, %name! %"', { name: 'World'}), "Hello, World! ");
    test.equal(evaluate("'Hello, %name! %'", { name: 'Wordl'}), "Hello, %name! %");
    test.equal(evaluate('"%% %name"', { name: 'World'}), "% World");
    test.equal(evaluate('"This % should not interpolate"'),
               "This % should not interpolate");
    test.equal(evaluate('hello_lbl % "wrong "', this.data), "Hello, !");
    test.equal(evaluate('hello_lbl % self', this.data), "Hello, World!");
    test.done();
  },

  "Piped Interpolation": function (test ) {
    var script1 = 'from string import title\n' +
                  'from list import join\n' +
                  '"Result is %some_array|join|title"';

    var script2 = 'from string import upper\n' +
                  '"The Title is %|upper" % "upper"';

    test.equal(evaluate(script1, this.data), "Result is Title Case String");
    test.equal(evaluate(script2, this.data), "The Title is UPPER");
    test.done();
  }
});

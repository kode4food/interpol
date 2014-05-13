var nodeunit = require('nodeunit')
  , interpol = require('../lib');

function eval(str, ctx) {
  var template = interpol(str);
  return template(ctx);
}

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
    test.equal(eval("'% is the new %' % ('red', 'black')"),
               "red is the new black");
    test.equal(eval("'%2 is the new %1' % ('red', 'black')"),
               "black is the new red");
    test.equal(eval("dogs_lbl % ('red', 'cats', 'dogs')", this.data),
               "Furthermore, dogs are the new cats");
    test.done();
  },

  "Automatic Interpolation": function (test) {
    test.equal(eval('"%% %%%% % %% %%%%%% %"'), "%% %%%% % %% %%%%%% %");
    test.equal(eval("'%% %%%% % %% %%%%%% %' % self"), "% %%  % %%% ");
    test.equal(eval('"Hello, %name!"', { name: 'World'}), "Hello, World!");
    test.equal(eval('"Hello, %name! %"', { name: 'World'}), "Hello, World! ");
    test.equal(eval("'Hello, %name! %'", { name: 'Wordl'}), "Hello, %name! %");
    test.equal(eval('"%% %name"', { name: 'World'}), "% World");
    test.equal(eval('"This % should not interpolate"'),
               "This % should not interpolate");
    test.equal(eval('hello_lbl % "wrong "', this.data), "Hello, !");
    test.equal(eval('hello_lbl % self', this.data), "Hello, World!");
    test.done();
  },

  "Piped Interpolation": function (test ) {
    var script1 = 'from string import title\n' +
                  'from list import join\n' +
                  '"Result is %some_array|join|title"';

    var script2 = 'from string import upper\n' +
                  '"The Title is %|upper" % "upper"';

    test.equal(eval(script1, this.data), "Result is Title Case String");
    test.equal(eval(script2, this.data), "The Title is UPPER");
    test.done();
  }
});

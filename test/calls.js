var nodeunit = require('nodeunit')
  , interpol = require('../lib');

function eval(str, ctx) {
  var template = interpol(str);
  return template(ctx);
}

exports.calls = nodeunit.testCase({
  setUp: function (callback) {
    this.data = {
      "name": ["title", "case"]
    };

    callback();
  },

  "Left Calls": function (test) {
    var script1 = 'from string import title\n' +
                  'from array import join\n' +
                  'let formatted = title(join(name))\n' +
                  '"Hello, %formatted!"';

    test.equal(eval(script1, this.data), "Hello, Title Case!");

    test.done();
  },

  "Right Calls": function (test) {
    var script1 = 'from string import title\n' +
                  'from array import join\n' +
                  'let formatted = name | join | title\n' +
                  '"Hello, %formatted!"';

    test.equal(eval(script1, this.data), "Hello, Title Case!");

    test.done();
  }
});

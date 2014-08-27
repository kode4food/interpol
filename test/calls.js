/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var nodeunit = require('nodeunit');
var interpol = require('../lib');
var evaluate = interpol.evaluate;

exports.calls = nodeunit.testCase({
  setUp: function (callback) {
    this.data = {
      "name": ["title", "case"]
    };

    callback();
  },

  "Left Calls": function (test) {
    var script1 = 'from string import title\n' +
                  'from list import join\n' +
                  'let formatted = title(join(name))\n' +
                  '"Hello, %formatted!"';

    test.equal(evaluate(script1, this.data), "Hello, Title Case!");

    test.done();
  },

  "Right Calls": function (test) {
    var script1 = 'from string import title\n' +
                  'from list import join\n' +
                  'let formatted = name | join | title\n' +
                  '"Hello, %formatted!"';

    test.equal(evaluate(script1, this.data), "Hello, Title Case!");

    test.done();
  }
});

/*
 * Interpol (Logicful HTML Templates)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var nodeunit = require('nodeunit');
var interpol = require('../lib');
var types = require('../lib/types');

function intFunction() {}
intFunction.__intFunction = 'part';
intFunction.toString = function () { return 'hello!'; };

exports.api = nodeunit.testCase({

  "Invalid Blessing": function (test) {
    test.throws(function() { interpol.bless(47); });
    test.done();
  },

  "Stringify": function (test) {
    test.equal(types.stringify("<b>"), "<b>");
    test.equal(types.stringify(true), "true");
    test.equal(types.stringify(false), "false");
    test.equal(types.stringify(function () {}), "");
    test.equal(types.stringify(47), "47");
    test.equal(types.stringify([1,2,3]), "1 2 3");
    test.equal(types.stringify({}), "[object Object]");
    test.equal(types.stringify(intFunction), "hello!");
    test.done();
  },

  "Escape Content": function (test) {
    test.equal(types.escapeContent("<b>"), "&lt;b&gt;");
    test.equal(types.escapeContent(true), "true");
    test.equal(types.escapeContent(false), "false");
    test.equal(types.escapeContent(function () {}), "");
    test.equal(types.escapeContent(47), "47");
    test.equal(types.escapeContent([1,2,3]), "1 2 3");
    test.equal(types.escapeContent({}), "[object Object]");
    test.equal(types.escapeContent(intFunction), "hello!");
    test.done();
  },

  "Truthy / Falsy": function (test) {
    test.equal(types.isTruthy(null), false);
    test.equal(types.isTruthy(), false);
    test.equal(types.isTruthy([]), false);
    test.equal(types.isTruthy({}), true);
    test.equal(types.isTruthy("hello"), true);
    test.equal(types.isTruthy([1]), true);
    test.equal(types.isFalsy(null), true);
    test.equal(types.isFalsy(), true);
    test.equal(types.isFalsy([]), true);
    test.equal(types.isFalsy({}), false);
    test.equal(types.isFalsy("hello"), false);
    test.equal(types.isFalsy([1]), false);
    test.done();
  }

});

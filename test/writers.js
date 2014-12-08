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
var writers = require('../lib/writers');

function testStringWriter(test, expected, renderCallback) {
  var writer = writers.createStringWriter();
  renderCallback(writer);
  var result = writer.done();
  test.equal(result, expected);
}

exports.writers = nodeunit.testCase({
  "String Writer": function (test) {

    testStringWriter(test, "<!--hello there-->", function (writer) {
      writer.comment("hello there");
    });

    testStringWriter(test, "<tag attr>", function (writer) {
      writer.startElement("tag", { attr: true });
    });

    testStringWriter(test, "<tag>", function (writer) {
      writer.startElement("tag", { attr: false });
    });

    test.done();
  }
});

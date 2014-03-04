/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../util');

var freezeObject = util.freezeObject;

function noOp() {}

function createNullWriter() {
  return freezeObject({
    startElement: noOp,
    selfCloseElement: noOp,
    endElement: noOp,
    comment: noOp,
    content: noOp,
    rawContent: noOp
  });
}

// Exports
exports.createNullWriter = createNullWriter;

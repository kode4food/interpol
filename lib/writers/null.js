/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util');

var freezeObject = util.freezeObject;

function noOp() {}

function createNullWriter() {
  return freezeObject({
    startRender: noOp,
    endRender: noOp,
    startElement: noOp,
    selfCloseElement: noOp,
    endElement: noOp,
    comment: noOp,
    docType: noOp,
    content: noOp,
    rawContent: noOp
  });
}

// Exports
exports.createNullWriter = createNullWriter;
interpol.createNullWriter = createNullWriter;
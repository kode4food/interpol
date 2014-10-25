/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');

function noOp() {}

/**
 * Creates a NullWriter.  All calls to this writer find their way into the
 * bit bucket.  Its primary purpose is to support the background rendering of
 * modules in order to yield their exported symbols.
 */
function createNullWriter() {
  return {
    startRender: noOp,
    endRender: noOp,
    startElement: noOp,
    selfCloseElement: noOp,
    endElement: noOp,
    comment: noOp,
    docType: noOp,
    content: noOp,
    raw: noOp
  };
}

function registerWriter(interpol) {
  interpol.createNullWriter = createNullWriter;
}

// Exported Functions
exports.createNullWriter = createNullWriter;
exports.registerWriter = registerWriter;
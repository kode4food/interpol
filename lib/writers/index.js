/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var domWriter = require('./dom');
var nullWriter = require('./null');
var stringWriter = require('./string');

// Exported Functions
exports.createDOMWriter = domWriter.createDOMWriter;
exports.createNullWriter = nullWriter.createNullWriter;
exports.createStringWriter = stringWriter.createStringWriter;

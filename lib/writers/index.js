/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var nullWriter = require('./null');
var stringWriter = require('./string');

function registerWriters(interpol) {
  nullWriter.registerWriter(interpol);
  stringWriter.registerWriter(interpol);
}

// Exported Functions
exports.registerWriters = registerWriters;

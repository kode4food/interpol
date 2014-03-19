/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var wrap = require('./wrap').wrap;

// Exports
exports.parse = wrap(JSON.parse);
exports.stringify = wrap(JSON.stringify);

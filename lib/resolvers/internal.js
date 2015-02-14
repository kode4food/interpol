/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var memory = require('./memory');
var system = require('./system');

// Exported Functions
exports.createMemoryResolver = memory.createMemoryResolver;
exports.createSystemResolver = system.createSystemResolver;

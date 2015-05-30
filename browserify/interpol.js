/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

// This module is used to collect the requirements for a minimal
// Browserify build.  It's of no interest to node.js

var namespace = require('../lib/namespace');
var writers = require('../lib/writers');

// Set the Interpol browser global
global.interpol = namespace.configureNamespace({
  createNullWriter: writers.createNullWriter,
  createStringWriter: writers.createStringWriter
});

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

// Set the Interpol browser global
var interpol = window.interpol = require('../lib/interpol');

// Register the Writers for easier access
var writers = require('../lib/writers');
interpol.createNullWriter = writers.createNullWriter;
interpol.createStringWriter = writers.createStringWriter;

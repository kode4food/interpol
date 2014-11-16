/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

require('es5-shim');

// This module is used to collect the requirements for a minimal
// Browserify build.  It's of no interest to Node.js

// Set the Interpol browser global
var interpol = window.interpol = require('../lib/interpol');

// Resolvers
require('../lib/resolvers/memory').registerResolver(interpol);
require('../lib/resolvers/system').registerResolver(interpol);

// Writers
require('../lib/writers/null').registerWriter(interpol);
require('../lib/writers/string').registerWriter(interpol);
require('../lib/writers/dom').registerWriter(interpol);

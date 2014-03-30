/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

// This module is used to collect the requirements for a minimal
// Browserify build.  It's of no interest to Node.js

// Set the Interpol browser global
window.$interpol = require('../lib/interpol');

// Resolvers
require('../lib/resolvers/memory');
require('../lib/resolvers/system');

// Writers
require('../lib/writers/null');
require('../lib/writers/array');
require('../lib/writers/dom');

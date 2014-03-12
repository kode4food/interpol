/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

// Set the Interpol browser global
window.$interpol = require('../lib/interpol');

// Resolvers
require('../lib/resolvers/system');
require('../lib/resolvers/helper');
require('../lib/resolvers/memory');

// Writers
require('../lib/writers/null');
require('../lib/writers/array');
require('../lib/writers/dom');

/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

module.exports = require('./interpol');

// Pull in Compiler Module
require('./compiler');

// Pull in default Resolvers
require('./resolvers');

// Attach default Writers
require('./writers');

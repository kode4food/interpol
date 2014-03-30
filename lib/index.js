/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

module.exports = require('./interpol');

// Pull in PEG.js Parser
require('./parser');

// Pull in default Resolvers
require('./resolvers');

// Attach default Writers
require('./writers');

// Pull in Express support
require('./express');

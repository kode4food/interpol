/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var interpol = module.exports = require('./interpol');

// Pull in default Resolvers
require('./resolvers').registerResolvers(interpol);

// Attach default Writers
require('./writers').registerWriters(interpol);

// Pull in Compiler Module
require('./compiler');

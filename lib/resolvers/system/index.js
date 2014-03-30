/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var memory = require('../memory')
  , defaultMemoryResolver = memory.defaultMemoryResolver;

defaultMemoryResolver.registerModule('math', require('./math'));
defaultMemoryResolver.registerModule('array', require('./array'));
defaultMemoryResolver.registerModule('string', require('./string'));

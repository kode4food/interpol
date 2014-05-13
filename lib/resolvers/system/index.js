/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var memory = require('../memory')
  , defaultMemoryResolver = memory.defaultMemoryResolver;

defaultMemoryResolver.registerModule('math', require('./math'));
defaultMemoryResolver.registerModule('list', require('./list'));
defaultMemoryResolver.registerModule('string', require('./string'));

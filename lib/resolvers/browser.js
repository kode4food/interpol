/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , system = require('./system')
  , helper = require('./helper')
  , memory = require('./memory');

var systemResolver = system.createSystemResolver()
  , helperResolver = helper.createHelperResolver({})
  , memoryResolver = memory.createMemoryResolver({});

interpol.systemResolver = systemResolver;
interpol.helperResolver = helperResolver;
interpol.memoryResolver = memoryResolver;

interpol.resolvers().push(systemResolver, helperResolver, memoryResolver);

/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

var interpol = require('../interpol');

require('./helper');
require('./memory');
require('./file');

var globalResolvers = interpol.resolvers()
  , helperResolver = interpol.createHelperResolver()
  , memoryResolver = interpol.createMemoryResolver();

globalResolvers.push(helperResolver);
globalResolvers.push(memoryResolver);

exports.globalResolvers = globalResolvers;
exports.helperResolver = helperResolver;
exports.memoryResolver = memoryResolver;

/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var math = require('./math');
var list = require('./list');
var string = require('./string');

var createMemoryResolver = require('../memory').createMemoryResolver;

function noOp() {}

function createSystemResolver(runtime) {
  var resolver = createMemoryResolver(runtime);
  resolver.registerModule('math', math);
  resolver.registerModule('list', list);
  resolver.registerModule('string', string);
  return resolver;
}

// Exported Functions
exports.createSystemResolver = createSystemResolver;


/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var blessModule = require('../memory').blessModule;

/**
 * Creates a new MemoryResolver.  As its name implies, this resolver
 * allows one to register a module to be stored in memory.  A default
 * instance of this resolver is used to store the System Modules.
 * Because of its flexibility, it can also be used to store custom
 * modules and native JavaScript helpers.
 *
 * @param {Runtime} [runtime] Runtime owner for MemoryResolver
 */
function createMemoryResolver(runtime) {
  var cache = {};

  var resolver = {
    resolveModule: resolveModule,
    resolveExports: resolveExports
  };

  runtime.resolvers().push(resolver);
  return resolver;

  function resolveModule() {
    return undefined;
  }

  function resolveExports(name) {
    var result = cache[name];
    if ( !result ) {
      return undefined;
    }

    return result.moduleExports;
  }
}

// Exported Functions
exports.createMemoryResolver = createMemoryResolver;

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

var blessModule = require('../memory').blessModule;

function createSystemResolver(runtime) {
  var system = {
    'math': blessModule(math),
    'list': blessModule(list),
    'string': blessModule(string)
  };

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
    return system[name];
  }
}

// Exported Functions
exports.createSystemResolver = createSystemResolver;

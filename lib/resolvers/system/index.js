/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var memory = require('../memory');

var math = require('./math');
var list = require('./list');
var render = require('./render');
var string = require('./string');

var createMemoryResolver = memory.createMemoryResolver;

function createSystemResolver(runtime) {
  var resolver = createMemoryResolver(runtime);

  resolver.registerModule('math', math);
  resolver.registerModule('list', list);
  resolver.registerModule('render', render);
  resolver.registerModule('string', string);

  delete resolver.registerModule;
  delete resolver.unregisterModule;

  runtime.resolvers().push(resolver);
  return resolver;
}

// Exported Functions
exports.createSystemResolver = createSystemResolver;

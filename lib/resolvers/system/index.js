/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../../util');
var helpers = require('../helpers');

var each = util.each;
var objectKeys = util.objectKeys;
var createModuleStub = helpers.createModuleStub;

var math = require('./math');
var list = require('./list');
var string = require('./string');


function createSystemResolver(runtime) {
  var modules = {
    'math': createModuleStub(math),
    'list': createModuleStub(list),
    'string': createModuleStub(string)
  };

  var moduleExports = {};
  each(objectKeys(modules), function (name) {
    moduleExports[name] = modules[name].exports();
  });

  var resolver = {
    resolveModule: resolveModule,
    resolveExports: resolveExports
  };

  runtime.resolvers().push(resolver);
  return resolver;

  function resolveModule(name) {
    return modules[name];
  }

  function resolveExports(name) {
    return moduleExports[name];
  }
}

// Exported Functions
exports.createSystemResolver = createSystemResolver;

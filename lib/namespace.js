/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');
var types = require('./types');
var runtime = require('./runtime');

var bless = types.bless;

var createRuntime = runtime.createRuntime;

var CURRENT_VERSION = "1.5.3";

function configureNamespace(namespace) {
  var globalRuntime = createRuntime(namespace);

  namespace.VERSION = CURRENT_VERSION;
  namespace.bless = bless;
  namespace.getRuntime = getRuntime;
  namespace.stopIteration = types.stopIteration;
  
  return namespace;  
  
  /**
   * Returns a new Runtime based on the provided options.  If no options are
   * provided, will return the global Runtime instance.
   *
   * @param {Object} [options] configuration Object
   */
  function getRuntime(options) {
    if ( !options ) {
      return globalRuntime;
    }
    return createRuntime(namespace, options);
  }
  
}

// Exported Functions
exports.configureNamespace = configureNamespace;

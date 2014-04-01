/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var fs = require('fs')
  , path = require('path')
  , interpol = require('./interpol')
  , util = require('./util');

require('./resolvers');

var ModuleName = "[$_a-zA-Z][$_a-zA-Z0-9]*"
  , ModulePathRegex = new RegExp(ModuleName + "([/]" + ModuleName + ")*")
  , nodeEnv = process.env.NODE_ENV || 'development'
  , isDevelopment = nodeEnv === 'development';

var DefaultOptions = { monitor: isDevelopment, compile: isDevelopment };

/**
 * Creates a new Express Rendering Engine.  Generally it's not necessary to
 * directly call this function, as an instance of the engine is created by
 * default in Interpol's `__express` property.  If you must, there are
 * three properties recognized by the localOptions.
 *
 * @param {Object} [localOptions] Object for configuring the Engine
 * @param {String} [localOptions.path] the directory for resolving modules
 * @param {boolean} [localOptions.monitor] monitor files for changes
 * @param {boolean} [localOptions.compile] Parse raw templates
 */

function createExpressEngine(localOptions) {
  var engineOptions = util.mixin({}, DefaultOptions, localOptions || {})
    , defaultPath = path.resolve(process.cwd(), 'views')
    , resOptions = util.mixin({ path: defaultPath }, engineOptions)
    , resolver = interpol.createFileResolver(resOptions)
    , resolvers = [resolver].concat(interpol.resolvers());

  return renderFile;

  function renderFile(templatePath, options, callback) {
    try {
      var basename = path.basename(templatePath)
        , match = ModulePathRegex.exec(basename);

      if ( !match ) {
        callback(new Error("Filename must be a resolvable identifier"), null);
        return;
      }

      var moduleName = match[0]
        , interpolOptions = { resolvers: resolvers, cache: !isDevelopment };

      for ( var i = resolvers.length - 1; i >= 0; i-- ) {
        var module = resolvers[i].resolveModule(moduleName, interpolOptions);
        if ( module ) {
          callback(null, module(options));
          return;
        }
      }

      // Last Resort.  This happens if the Resolver finds nothing when
      // trying to resolve a template.  It usually means that you've
      // configured the Resolver incorrectly.

      console.warn("Last resort compilation - Resolver not doing its job");
      var templateSource = fs.readFileSync(templatePath).toString()
        , template = interpol(templateSource, interpolOptions);

      callback(null, template(options));
    }
    catch ( err ) {
      callback(err, null);
    }
  }
}

// Set default View Engine
interpol.__express = createExpressEngine();

// Exported Functions
exports.createExpressEngine = createExpressEngine;
interpol.createExpressEngine = createExpressEngine;

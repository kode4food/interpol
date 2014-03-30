/**
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

var ModuleNameRegex = /^[$_a-zA-Z][$_a-zA-Z0-9]*/
  , nodeEnv = process.env.NODE_ENV || 'development'
  , isDevelopment = nodeEnv === 'development';

var DefaultOptions = { monitor: isDevelopment, compile: isDevelopment };

/**
 * Creates a new Express Rendering Engine.  Generally it's not necessary to
 * directly call this function, as an instance of the engine is created by
 * default in Interpol's `__express` property.  If you must, there are
 * three properties recognized by the localOptions.
 *
 * localOptions:Object? - Object for configuring the Engine
 *   path:String - The directory for resolving modules ('./views' by default)
 *   monitor:boolean - Monitor files for changes (and take a performance hit)
 *   compile:boolean - Parse raw templates (and take a performance hit)
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
        , match = ModuleNameRegex.exec(basename);

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

      // Last Resort
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

// Exports
exports.createExpressEngine = createExpressEngine;
interpol.createExpressEngine = createExpressEngine;

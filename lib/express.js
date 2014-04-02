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

var freezeObject = util.freezeObject;

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
 * @param {String} [localOptions.path] the fallback path for resolving modules
 * @param {boolean} [localOptions.monitor] monitor files for changes
 * @param {boolean} [localOptions.compile] Parse raw templates
 */

function createExpressEngine(localOptions) {
  var engineOptions = util.mixin({}, DefaultOptions, localOptions || {})
    , defaultPath = path.resolve(process.cwd(), 'views')
    , optionsCache = {};

  return renderFile;

  function renderFile(templatePath, options, callback) {
    try {
      var viewsPath = options.settings.views || defaultPath
        , modulePath = templatePath.slice(viewsPath.length + 1)
        , interpolOptions = optionsCache[viewsPath]
        , match = ModulePathRegex.exec(modulePath);

      if ( !interpolOptions ) {
        interpolOptions = createOptions(viewsPath);
      }

      if ( !match ) {
        callback(new Error("Filename must be a resolvable identifier"), null);
        return;
      }

      var moduleName = match[0]
        , resolvers = interpolOptions.resolvers;

      for ( var i = resolvers.length - 1; i >= 0; i-- ) {
        var module = resolvers[i].resolveModule(moduleName, interpolOptions);
        if ( module ) {
          callback(null, module(options));
          return;
        }
      }

      callback(new Error("Template not resolved: " + templatePath), null);
    }
    catch ( err ) {
      callback(err, null);
    }
  }

  function createOptions(viewsPath) {
    var resOptions = util.mixin({ path: viewsPath }, engineOptions)
      , resolver = interpol.createFileResolver(resOptions);

    var options = optionsCache[viewsPath] = freezeObject({
      resolvers: freezeObject([resolver].concat(interpol.resolvers())),
      cache: !isDevelopment
    });

    return options;
  }
}

// Set default View Engine
interpol.__express = createExpressEngine();

// Exported Functions
exports.createExpressEngine = createExpressEngine;
interpol.createExpressEngine = createExpressEngine;

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
  , DefaultOptions = { compile: true, monitor: true };

var resolverCache = {};

function createExpressEngine(localOptions) {
  var engineOptions = util.extend({}, DefaultOptions, localOptions || {})
    , engineResolvers = engineOptions.resolvers
    , enginePath = engineOptions.path || [];

  return renderFile;

  function renderFile(templatePath, options, callback) {
    try {
      var searchPath = enginePath.concat(path.dirname(templatePath))
        , resolverKey = searchPath.join(':')
        , resolvers = resolverCache[resolverKey];

      if ( !resolvers ) {
        var resOptions = util.extend({}, engineOptions, { path: searchPath })
          , resolver = interpol.createFileResolver(resOptions);

        resolvers = (engineResolvers || interpol.resolvers()).slice(0);
        resolvers.push(resolver);

        resolverCache[resolverKey] = resolvers;
      }

      var basename = path.basename(templatePath)
        , match = ModuleNameRegex.exec(basename);

      if ( !match ) {
        callback(new Error("Filename must be a resolvable identifier"), null);
        return;
      }

      var moduleName = match[0]
        , interpolOptions = { resolvers: resolvers };

      for ( var i = resolvers.length; i--; ) {
        var mod = resolvers[i].resolveModule(moduleName, interpolOptions);
        if ( mod ) {
          callback(null, mod.self(options));
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

// Exports
exports.createExpressEngine = createExpressEngine;

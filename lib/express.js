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
  , DefaultOptions = { monitor: true };

function createExpressEngine(localOptions) {
  var engineOptions = util.mixin({}, DefaultOptions, localOptions || {})
    , defaultPath = path.resolve(process.cwd(), 'views')
    , resOptions = util.mixin({ path: defaultPath }, engineOptions)
    , resolver = interpol.createFileResolver(resOptions)
    , resolvers = interpol.resolvers().concat(resolver);

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
        , interpolOptions = { resolvers: resolvers };

      for ( var i = resolvers.length; i--; ) {
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

// Exports
exports.createExpressEngine = createExpressEngine;

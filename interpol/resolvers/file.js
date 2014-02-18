/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

(function (interpol) {
  "use strict";

  var fs = require('fs')
    , path = require('path');

  interpol.createFileResolver = createFileResolver;

  function createFileResolver(options) {
    var searchPath = options.path || process.cwd()
      , performCompilation = options.compile
      , cache = {};

    if ( !Array.isArray(searchPath) ) {
      searchPath = [searchPath];
    }
    searchPath = searchPath.reverse();

    return {
      resolveModule: resolveModule
    };

    function resolveModule(name) {
      var module = cache[name];
      if ( module ) {
        return module;
      }

      for ( var i = searchPath.length; i--; ) {
        var jsonName = path.resolve(searchPath[i], name + '.int.json')
          , content;

        if ( fs.existsSync(jsonName) ) {
          try {
            content = JSON.parse(fs.readFileSync(jsonName));
            return cache[name] = interpol(content).exports();
          }
          catch ( err ) {
            // How to handle this, maybe not at all
          }
        }

        var intName = path.resolve(searchPath[i], name + '.int');

        if ( performCompilation && fs.existsSync(intName) ) {
          content = fs.readFileSync(intName);
          return cache[name] = interpol(content).exports();
        }
      }

      return null;
    }
  }
})(typeof require === 'function' ? require('../interpol') : $interpol);

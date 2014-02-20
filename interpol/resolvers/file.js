/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

(function (interpol) {
  "use strict";

  var FilenameExtensionRegex = /\.int(\.json)?$/;

  var fs = require('fs')
    , path = require('path');

  interpol.createFileResolver = createFileResolver;

  function createFileResolver(options) {
    var searchPath = options.path || process.cwd()
      , performCompilation = options.compile
      , monitorChanges = options.monitor
      , cache = {}, dirty = {};

    if ( !Array.isArray(searchPath) ) {
      searchPath = [searchPath];
    }
    searchPath = searchPath.reverse();

    if ( monitorChanges ) {
      for ( var i = searchPath.length; i--; ) {
        fs.watch(searchPath[i], monitorResult);
      }
    }

    return {
      resolveModule: resolveModule
    };

    function resolveModule(name, options) {
      var module = cache[name];
      if ( module && !dirty[name] ) {
        return module;
      }

      for ( var i = searchPath.length; i--; ) {
        var jsonName = path.resolve(searchPath[i], name + '.int.json')
          , content;

        if ( fs.existsSync(jsonName) ) {
          try {
            content = JSON.parse(fs.readFileSync(jsonName));
            return cacheModule(name, interpol(content, options).exports());
          }
          catch ( err ) {
            // TODO: How to handle this, maybe not at all
          }
        }

        if ( !performCompilation ) {
          continue;
        }

        var intName = path.resolve(searchPath[i], name + '.int');
        if ( fs.existsSync(intName) ) {
          try {
            content = fs.readFileSync(intName).toString();
            return cacheModule(name, interpol(content, options).exports());
          }
          catch ( err ) {
            // TODO: How to handle this, maybe not at all
          }
        }
      }

      return null;
    }

    function cacheModule(name, module) {
      var cached = cache[name]
        , key;

      if ( !cached ) {
        cache[name] = cached = {};
      }
      else {
        // This logic is necessary because another module may already be
        // caching this result as a dependency.
        for ( key in cached ) {
          if ( cached.hasOwnProperty(key) ) {
            delete cached[key];
          }
        }
      }

      for ( key in module ) {
        if ( module.hasOwnProperty(key) ) {
          cached[key] = module[key];
        }
      }

      delete dirty[name];
      return cached;
    }

    function monitorResult(event, filename) {
      if ( filename && filename.match(FilenameExtensionRegex) ) {
        var name = filename.replace(FilenameExtensionRegex, '');
        dirty[name] = true;
      }
    }
  }
})(typeof require === 'function' ? require('../interpol') : $interpol);

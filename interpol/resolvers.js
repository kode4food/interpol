/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

(function (interpol) {
  "use strict";

  var isNode = typeof require === 'function' && typeof module === 'object';

  var globalResolvers = interpol.resolvers();

  function createModuleCache() {
    var cache = {};

    return {
      getModule: getModule,
      putModule: putModule,
      removeModule: removeModule
    };

    function getModule(name) {
      return cache[name];
    }

    function putModule(name, module) {
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

      return cached;
    }

    function removeModule(name) {
      delete cache[name];
    }
  }

  // Helper Resolver **********************************************************

  (function () {
    var helperResolver = createHelperResolver({});
    interpol.createHelperResolver = createHelperResolver;
    interpol.helperResolver = helperResolver;
    globalResolvers.push(helperResolver);

    function createHelperResolver(options) {
      options = options || {};

      var moduleName = options.name || 'helpers'
        , module = {};

      return {
        resolveModule: resolveModule,
        registerHelper: registerHelper,
        unregisterHelper: unregisterHelper
      };

      function resolveModule(name) {
        return name === moduleName ? module : null;
      }

      function registerHelper(name, func) {
        if ( typeof name === 'function' ) {
          func = name;
          if ( !func.name ) {
            throw new Error("Function requires a name");
          }
          name = func.name;
        }
        func._interpolPartial = true;
        module[name] = func;
      }

      function unregisterHelper(name) {
        if ( typeof name === 'function' ) {
          name = name.name;
        }
        if ( name ) {
          delete module[name];
        }
      }
    }
  })();

  // Memory Resolver **********************************************************

  (function () {
    var memoryResolver = createMemoryResolver({});
    interpol.createMemoryResolver = createMemoryResolver;
    interpol.memoryResolver = memoryResolver;
    globalResolvers.push(memoryResolver);

    function createMemoryResolver(options) {
      var cache = createModuleCache();

      return {
        resolveModule: cache.getModule,
        unregisterModule: cache.removeModule,
        registerModule: registerModule
      };

      function registerModule(name, module) {
        if ( typeof module === 'function' &&
             typeof module.exports === 'function' ) {
          cache.putModule(name, module.exports());
          return;
        }

        if ( typeof module === 'string' ||
             typeof module.length === 'number' ) {
          cache.putModule(name, interpol(module).exports());
          return;
        }

        if ( typeof module === 'object' ) {
          cache.putModule(name, module);
          return;
        }

        throw new Error("Module not provided");
      }
    }
  })();

  // File Resolver ************************************************************

  (function () {
    if ( !isNode ) { return; }

    var fs = require('fs')
      , path = require('path')
      , util = require('./util');

    interpol.createFileResolver = createFileResolver;

    function createFileResolver(options) {
      var cache = createModuleCache()
        , searchPath = options.path || process.cwd()
        , isDirty = options.monitor ? util.createDirtyChecker() : notDirty;

      return {
        resolveModule: resolveModule
      };

      function notDirty() {
        // Always return false
        return false;
      }

      function resolveModule(name, options) {
        var module = cache.getModule(name)
          , sourcePath = path.resolve(searchPath, name + '.int');

        if ( !isDirty(sourcePath) && module ) {
          return module;
        }

        if ( fs.existsSync(sourcePath) ) {
          try {
            var content = fs.readFileSync(sourcePath).toString();
            return cacheModule(name, interpol(content, options).exports());
          }
          catch ( err ) {
            // TODO: How to handle this, maybe not at all
            console.warn("Error Parsing " + sourcePath);
            console.warn(err);
            return module;
          }
        }
        else {
          cache.removeModule(name);
          return null;
        }
      }

      function cacheModule(name, module) {
        return cache.putModule(name, module);
      }
    }
  })();

})(typeof require === 'function' ? require('../interpol') : this.$interpol);

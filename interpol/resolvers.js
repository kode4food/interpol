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

  function formatSyntaxError(filePath, err) {
    if ( !err.name || err.name !== 'SyntaxError') {
      return err;
    }

    var unexpected = err.found ? "'" + err.found + "'" : "end of file"
      , errString = "Unexpected " + unexpected
      , lineInfo = ":" + err.line + ":" + err.column;

    return new Error(filePath + lineInfo + ": " + errString);
  }

  function createModuleCache() {
    var cache = {};

    return {
      exists: exists,
      getModule: getModule,
      getExports: getExports,
      putModule: putModule,
      removeModule: removeModule
    };

    function exists(name) {
      return cache[name];
    }

    function getModule(name) {
      var result = cache[name];
      return result ? result.module : null;
    }

    function getExports(name) {
      var result = cache[name];
      if ( !result ) {
        return null;
      }

      if ( !result.dirtyExports ) {
        return result.moduleExports;
      }

      var moduleExports = result.moduleExports
        , key = null;

      if ( !moduleExports ) {
        moduleExports = result.moduleExports = {};
      }
      else {
        // This logic is necessary because another module may already be
        // caching this result as a dependency.
        for ( key in moduleExports ) {
          if ( moduleExports.hasOwnProperty(key) ) {
            delete moduleExports[key];
          }
        }
      }

      var exported = result.module.exports();
      for ( key in exported ) {
        if ( exported.hasOwnProperty(key) ) {
          moduleExports[key] = exported[key];
        }
      }

      result.dirtyExports = false;
      return moduleExports;
    }

    function putModule(name, module) {
      var cached = cache[name];
      if ( cached ) {
        cached.module = module;
        cached.dirtyExports = true;
      }
      else {
        cached = cache[name] = { module: module, dirtyExports: true };
      }
      return cached.module;
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
        , moduleExports = {};

      return {
        resolveModule: resolveModule,
        resolveExports: resolveExports,
        registerHelper: registerHelper,
        unregisterHelper: unregisterHelper
      };

      function resolveModule(name) {
        return null;
      }

      function resolveExports(name) {
        return name === moduleName ? moduleExports : null;
      }

      function registerHelper(name, func) {
        if ( typeof name === 'function' ) {
          func = name;
          if ( !func.name ) {
            throw new Error("Function requires a name");
          }
          name = func.name;
        }
        moduleExports[name] = interpol.bless(func);
      }

      function unregisterHelper(name) {
        if ( typeof name === 'function' ) {
          name = name.name;
        }
        if ( name ) {
          delete moduleExports[name];
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
        resolveExports: cache.getExports,
        unregisterModule: cache.removeModule,
        registerModule: registerModule
      };

      function registerModule(name, module) {
        if ( typeof module === 'function' &&
             typeof module.exports === 'function' ) {
          cache.putModule(name, module);
          return;
        }

        if ( typeof module === 'string' ||
             typeof module.length === 'number' ) {
          cache.putModule(name, interpol(module));
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
        resolveModule: resolveModule,
        resolveExports: resolveExports
      };

      function notDirty() {
        // Always return false
        return false;
      }

      function reloadIfNeeded(name, options) {
        var sourcePath = path.resolve(searchPath, name + '.int')
          , dirty = isDirty(sourcePath);

        var loadable = ( dirty && dirty.isFile() ) ||
                       ( !dirty && fs.existsSync(sourcePath) );

        if ( loadable ) {
          try {
            var content = fs.readFileSync(sourcePath).toString();
            cache.putModule(name, interpol(content, options));
          }
          catch ( err ) {
            throw formatSyntaxError(name + '.int', err);
          }
        }
        else {
          cache.removeModule(name);
          return null;
        }
      }

      function resolveModule(name, options) {
        reloadIfNeeded(name, options);
        return cache.getModule(name);
      }

      function resolveExports(name, options) {
        reloadIfNeeded(name, options);
        return cache.getExports(name);
      }
    }
  })();

})(typeof require === 'function' ? require('../interpol') : this.$interpol);

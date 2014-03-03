/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

var fs = require('fs');

function extend(target) {
  for ( var i = 1, len = arguments.length; i < len; i++ ) {
    var src = arguments[i];
    if ( !src ) {
      continue;
    }
    for ( var key in src ) {
      if ( !src.hasOwnProperty(key) ) {
        continue;
      }
      target[key] = src[key];
    }
  }
  return target;
}

function createDirtyChecker() {
  var cache = {};

  return isDirty;

  function isDirty(filePath) {
    var cached = cache[filePath]
      , stats = null;

    try {
      stats = cache[filePath] = fs.statSync(filePath);
    }
    catch ( err ) {
      stats = null;
    }

    if ( !(stats && cached) ) {
      return stats || cached;
    }

    stats.mtime = stats.mtime.getTime();
    if ( cached.size !== stats.size || cached.mtime !== stats.mtime ) {
      return stats;
    }
    return false;
  }
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

function formatSyntaxError(err, filePath) {
  if ( !err.name || err.name !== 'SyntaxError') {
    return err;
  }

  var unexpected = err.found ? "'" + err.found + "'" : "end of file"
    , errString = "Unexpected " + unexpected
    , lineInfo = ":" + err.line + ":" + err.column;

  return new Error((filePath || '') + lineInfo + ": " + errString);
}

// Exports
exports.extend = extend;
exports.createDirtyChecker = createDirtyChecker;
exports.createModuleCache = createModuleCache;
exports.formatSyntaxError = formatSyntaxError;

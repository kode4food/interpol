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
  , util = require('../util')
  , interpol = require('../interpol');

function createFileResolver(options) {
  var cache = util.createModuleCache()
    , searchPath = options.path || process.cwd()
    , isDirty = options.monitor ? createDirtyChecker() : notDirty;

  return {
    resolveModule: resolveModule,
    resolveExports: resolveExports
  };

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
        throw util.formatSyntaxError(err, name + '.int');
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

function notDirty() {
  // Always return false
  return false;
}

// Exports
exports.createFileResolver = createFileResolver;
interpol.createFileResolver = createFileResolver;

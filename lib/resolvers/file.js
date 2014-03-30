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
  , util = require('../util')
  , interpol = require('../interpol');

// Create a new File Resolver.  This resolver is used by the Express View
// Render engine to retrieve Interpol templates and pre-parsed JSON from
// disk.  To avoid a disk hit for every non-file request, you should include
// this resolver at the beginning of a resolver list (since Interpol scans
// the resolvers from the end of the list).
// 
// * options:Object? - Object for configuring the Resolver
//
//   * path:String - The base directory for resolving modules
//   * monitor:boolean - Monitor files for changes (and take a performance hit)
//   * compile:boolean - Parse raw templates (and take a performance hit)

function createFileResolver(options) {
  var cache = {}
    , basePath = options.path || process.cwd()
    , monitor = options.monitor
    , isDirty = options.monitor ? createDirtyChecker() : notDirty
    , loadContent = options.compile ? loadContentString : loadContentJSON
    , ext = options.compile ? '.int' : '.int.json';

  return {
    resolveModule: resolveModule,
    resolveExports: resolveExports
  };

  function reloadIfNeeded(name, options) {
    var sourcePath = path.resolve(basePath, name + ext)
      , dirty = isDirty(sourcePath);

    var loadable = ( dirty && dirty.isFile() ) ||
                   ( !dirty && fs.existsSync(sourcePath) );

    if ( loadable ) {
      try {
        var content = loadContent(sourcePath);
        putModule(name, interpol(content, options));
      }
      catch ( err ) {
        throw util.formatSyntaxError(err, name + ext);
      }
    }
    else {
      delete cache[name];
      return null;
    }
  }

  function resolveModule(name, options) {
    if ( monitor || !cache[name] ) {
      reloadIfNeeded(name, options);
    }
    var result = cache[name];
    return result ? result.module : null;
  }

  function resolveExports(name, options) {
    var result = cache[name];
    if ( monitor || !result ) {
      reloadIfNeeded(name, options);
      result = cache[name];
      if ( !result ) {
        return null;
      }
    }

    if ( !result.dirtyExports ) {
      return result.moduleExports;
    }

    var moduleExports = result.moduleExports = result.module.exports();
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
}

function loadContentString(sourcePath) {
  return fs.readFileSync(sourcePath).toString();
}

function loadContentJSON(sourcePath) {
  return JSON.parse(fs.readFileSync(sourcePath).toString());
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
  return false;  // Always return false
}

// Exports
exports.createFileResolver = createFileResolver;
interpol.createFileResolver = createFileResolver;

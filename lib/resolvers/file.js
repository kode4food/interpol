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

/**
 * Creates a new File Resolver.  This resolver is used by the Express View
 * Render engine to retrieve Interpol templates and pre-parsed JSON from
 * disk.  To avoid a disk hit for every non-file request, you should include
 * this resolver at the beginning of a resolver list (since Interpol scans
 * the resolvers from the end of the list).
 *
 * @param {Object} [options] Options for generating the File Resolver
 * @param {String} [options.path] the base directory for resolving modules
 * @param {boolean} [options.monitor] Monitor files for changes
 * @param {boolean} [options.compile] Parse raw templates
 */
 
function createFileResolver(options) {
  var cache = {}
    , basePath = options.path || process.cwd()
    , monitor = options.monitor
    , isDirty = options.monitor ? createDirtyChecker() : notDirty
    , loadContent = options.compile ? loadContentString : loadContentJSON
    , ext = options.compile ? '.int' : '.int.json';

  // All Resolvers must expose at least these two Functions
  return {
    resolveModule: monitor ? resolveMonitoredModule : resolveCachedModule,
    resolveExports: monitor ? resolveMonitoredExports : resolveCachedExports
  };

  /**
   * Load (or Reload) the specified file if necessary.  The options will
   * be passed through to the Interpol compile, if necessary.
   *
   * @param {String} name the name of the file to check
   * @param {Object} options the Interpol compiler options
   */

  function reloadIfNeeded(name, options) {
    var sourcePath = path.resolve(basePath, name + ext)
      , dirty = isDirty(sourcePath);

    var loadable = ( dirty && dirty.isFile() ) ||
                   ( !dirty && fs.existsSync(sourcePath) );

    if ( loadable ) {
      try {
        var content = loadContent(sourcePath)
          , template = interpol(content, options)
          , cached = cache[name] = { module: template };
        return cached;
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

  function resolveMonitoredModule(name, options) {
    // Always attempt to reload the file if necessary
    var result = reloadIfNeeded(name, options);
    return result ? result.module : null;
  }

  function resolveCachedModule(name, options) {
    // Only load the file in the case of a cache miss
    var result = cache[name];
    if ( result ) {
      return result.module;
    }

    result = reloadIfNeeded(name, options);
    return result ? result.module : null;
  }

  function resolveMonitoredExports(name, options) {
    // Always attempt to re-process the exports if necessary
    var result = reloadIfNeeded(name, options);
    if ( !result ) {
      return null;
    }

    var moduleExports = result.moduleExports;
    if ( moduleExports ) {
      return moduleExports;
    }

    moduleExports = result.moduleExports = result.module.exports();
    return moduleExports;
  }

  function resolveCachedExports(name, options) {
    // Only process the exports in the case of a cache miss
    var result = cache[name];
    if ( !result ) {
      result = reloadIfNeeded(name, options);
      if ( !result ) {
        return null;
      }
    }

    var moduleExports = result.moduleExports;
    if ( moduleExports ) {
      return moduleExports;
    }

    moduleExports = result.moduleExports = result.module.exports();
    return moduleExports;
  }
}

function loadContentString(sourcePath) {
  return fs.readFileSync(sourcePath).toString();
}

function loadContentJSON(sourcePath) {
  return JSON.parse(fs.readFileSync(sourcePath).toString());
}

/**
 * Creates a cache of file modification timestamps in order to check
 * whether or not a file has been modified since last requested.  This
 * interface introduces a performance hit for template processing, and
 * is only used when the File Resolver's `monitor` property is set.
 */

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

/**
 * If the File Resolver's `monitor` property is not set, then this
 * interface is used instead.  Effectively, it enables permanent
 * caching of items without checks.
 */

function notDirty() {
  return false;  // Always return false
}

// Exports
exports.createFileResolver = createFileResolver;
interpol.createFileResolver = createFileResolver;

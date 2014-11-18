/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var vm = require('vm');
var fs = require('fs');
var path = require('path');
var parser = require('../compiler/parser');
var types = require('../types');
var util = require('../util');

var formatSyntaxError = parser.formatSyntaxError;
var isInterpolNodeModule = types.isInterpolNodeModule;
var bind = util.bind;

function noOp() {}

/**
 * Creates a new FileResolver.  This resolver is used by the Express View
 * Render engine to retrieve Interpol templates and pre-compiled JavaScript
 * from disk.  To avoid a disk hit for every non-file request, you should
 * include this resolver at the beginning of a resolver list (since Interpol
 * scans the resolvers from the end of the list).
 *
 * @param {Runtime} [runtime] Runtime owner for FileResolver
 * @param {Object} [options] Options for generating the FileResolver
 * @param {String} [options.path] the base directory for resolving modules
 * @param {boolean} [options.monitor] Monitor files for changes
 * @param {boolean} [options.compile] Parse raw templates
 */
function createFileResolver(runtime, options) {
  var interpol = runtime.interpol;
  var cache = {};
  var basePath = options.path || process.cwd();
  var monitor = options.monitor;
  var checkFileStatus = createFileStatusChecker();
  var resolveTemplate = options.compile ? resolveInt : resolveJS;
  var ext = options.compile ? '.int' : '.int.js';

  // All Resolvers must expose at least these two Functions
  var resolver = {
    resolveModule: monitor ? resolveMonitoredModule : resolveCachedModule,
    resolveExports: monitor ? resolveMonitoredExports : resolveCachedExports
  };

  runtime.resolvers().push(resolver);
  return resolver;

  /**
   * Load (or Reload) the specified file if necessary.  The options will
   * be passed through to the Interpol compiler, if necessary.
   *
   * @param {String} name the name of the file to check
   * @param {Object} options the Interpol compiler options
   */
  function reloadIfNeeded(name) {
    // Prefer to resolve a module by moduleName + extension
    var sourcePath = path.resolve(basePath, name + ext);
    var statusResult = checkFileStatus(sourcePath);
    var cached;

    if ( !statusResult.exists ) {
      // Otherwise check a directory's `index.int` file if there is one
      var modulePath = path.resolve(basePath, name);
      if ( statDirectory(modulePath) ) {
        sourcePath = path.resolve(basePath, name, 'index' + ext);
        statusResult = checkFileStatus(sourcePath);
      }
    }

    if ( !statusResult.exists ) {
      cached = cache[name] = { module: null };
      return cached;
    }

    if ( statusResult.dirty ) {
      try {
        var template = resolveTemplate(sourcePath);
        cached = cache[name] = { module: template };
        return cached;
      }
      catch ( err ) {
        throw formatSyntaxError(err, name + ext);
      }
    }

    cached = cache[name];
    if ( !cached ) {
      cached = cache[name] = { module: null };
    }
    return cached;
  }

  function resolveMonitoredModule(name) {
    // Always attempt to reload the file if necessary
    var result = reloadIfNeeded(name);
    return result.module;
  }

  function resolveCachedModule(name) {
    // Only load the file in the case of a cache miss
    var result = cache[name];
    if ( result ) {
      return result.module;
    }

    result = reloadIfNeeded(name);
    return result.module;
  }

  function resolveMonitoredExports(name) {
    // Always attempt to re-process the exports if necessary
    var result = reloadIfNeeded(name);
    if ( !result || !result.module ) {
      return undefined;
    }

    var moduleExports = result.moduleExports;
    if ( moduleExports ) {
      return moduleExports;
    }

    moduleExports = result.moduleExports = result.module.exports();
    return moduleExports;
  }

  function resolveCachedExports(name) {
    // Only process the exports in the case of a cache miss
    var result = cache[name];
    if ( !result ) {
      result = reloadIfNeeded(name);
      if ( !result ) {
        return undefined;
      }
    }

    var moduleExports = result.moduleExports;
    if ( moduleExports ) {
      return moduleExports;
    }

    moduleExports = result.moduleExports = result.module.exports();
    return moduleExports;
  }

  function resolveInt(sourcePath) {
    var content = fs.readFileSync(sourcePath).toString();
    return interpol(content, runtime);
  }

  function resolveJS(sourcePath) {
    var content = fs.readFileSync(sourcePath).toString();

    var context = vm.createContext({
      module: { exports: {} }
    });
    vm.runInContext(content, context, sourcePath);

    var module = context.module.exports;
    if ( !isInterpolNodeModule(module) ) {
      throw new Error("Module is not an Interpol Template: " + sourcePath);
    }
    return module.createTemplate(runtime);
  }
}

function statFile(filePath) {
  try {
    var stat = fs.statSync(filePath);
    return stat && stat.isFile() ? stat : null;
  }
  catch ( err ) {
    return undefined;
  }
}

function statDirectory(dirPath) {
  try {
    var stat = fs.statSync(dirPath);
    return stat && stat.isDirectory() ? stat : undefined;
  }
  catch ( err ) {
    return undefined;
  }
}

/**
 * Creates a cache of file modification timestamps in order to check
 * whether or not a file has been modified since last requested.  This
 * interface introduces a performance hit for template processing, and
 * is only used when the File Resolver's `monitor` property is set.
 */
function createFileStatusChecker() {
  var cache = {};

  statusChecker.notModified = 0;
  statusChecker.notFound = 1;
  statusChecker.deleted = 2;
  statusChecker.newFile = 3;
  statusChecker.modified = 4;

  return statusChecker;

  function statusChecker(filePath) {
    var cached = cache[filePath];
    var stats = cache[filePath] = statFile(filePath);

    if ( !cached && !stats ) {
      return {
        status: statusChecker.notFound,
        exists: false
      };
    }
    if ( cached && !stats ) {
      return {
        status: statusChecker.deleted,
        stats: cached,
        exists: false
      };
    }
    if ( !cached && stats ) {
      return {
        status: statusChecker.newFile,
        stats: stats,
        exists: true,
        dirty: true
      };
    }

    var modified = cached.size !== stats.size ||
                   cached.mtime.getTime() !== stats.mtime.getTime();

    return {
      status: modified ? statusChecker.modified : statusChecker.notModified,
      stats: stats,
      exists: true,
      dirty: modified
    };
  }
}

// Exported Functions
exports.createFileResolver = createFileResolver;

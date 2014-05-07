#!/usr/bin/env node

/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var fs = require('fs')
  , path = require('path')
  , glob = require('glob')
  , mkdirp = require('mkdirp')
  , interpol = require('./index')
  , util = require('./util');

var ModuleNameRegex = /^[$_a-zA-Z][$_a-zA-Z0-9\\/]*/
  , OptionRegex = /^-([a-zA-Z][_a-zA-Z0-9]*)$/;

var slice = Array.prototype.slice;

if ( require.main === module ) {
  commandLine.apply(null, slice.call(process.argv, 2));
}

// ## Command Line Processing

/**
 * Executes Interpol command-line parsing.  Each argument is treated as it
 * would be had it come from the operating system's shell and should be a
 * string.  This function is normally invoked automatically when the cli.js
 * script is called directly.
 *
 * Example:
 *
 *     commandLine("-in", "./templates", "-out", "./output");
 *
 * @param {...String} [arguments] usage info displayed if an error occurs
 */

function commandLine() {
  var args = parseArguments(arguments)
    , inDirs = getArrayArg('in');

  if ( args.help || !inDirs.length ) {
    displayUsage();
    process.exit(0);
  }

  var parseOnly = getValueArg('parse') || false
    , jsonFile = (!parseOnly && getValueArg('json')) || null
    , appFile = (!parseOnly && getValueArg('app')) || null
    , skipWrite = jsonFile || appFile || parseOnly
    , appProperty = getValueArg('prop') || null
    , appSandbox = getValueArg('sandbox') || false
    , appModules = {}
    , pattern = getValueArg('files') || '**/*.int'
    , ext = getValueArg('ext') || '.json'
    , success = []
    , errors = []
    , warnings = [];

  // Iterate over the `-in` directories
  processDirectories();
  // Display the results
  processResults();
  if ( warnings.length ) {
    // If there are any warnings, display them
    processWarnings();
  }
  if ( errors.length ) {
    // If there are any errors, display them
    processErrors();
  }
  else if ( appFile || jsonFile ) {
    // Otherwise generate a bundle if requested
    processBundle();
  }
  // Done!
  process.exit(errors.length ? 1 : 0);

  function processDirectories() {
    for ( var i = 0, len = inDirs.length; i < len; i++ ) {
      processDirectory(inDirs[i]);
    }
  }

  function processDirectory(inDir) {
    var outDir = getValueArg('out') || inDir
      , files = glob.sync(pattern, { cwd: inDir });

    if ( !files.length ) {
      errorOut("No files found matching '" + pattern + "' in " + inDir);
      return;
    }

    for ( var i = 0, ilen = files.length; i < ilen; i++ ) {
      var file = files[i]
        , moduleName = getModuleName(file)
        , inputPath = path.join(inDir, file);

      try {
        var json = parseInputTemplate(inputPath)
          , jsonWarnings = json.e || [];

        if ( jsonWarnings.length ) {
          for ( var j = 0, jlen = jsonWarnings.length; j < jlen; j++ ) {
            warnings.push({ filePath: inputPath, err: jsonWarnings[j] });
          }
        }
        delete json.e; // not needed

        if ( skipWrite ) {
          appModules[moduleName] = json;
        }
        else {
          writeTemplateJSON(json, path.join(outDir, file + ext));
        }

        success.push({ filePath: inputPath });
      }
      catch ( err ) {
        errors.push({ filePath: inputPath, err: err });
      }
    }
  }

  function processResults() {
    console.info("Interpol Parsing Complete");
    console.info("");
    if ( success.length ) {
      console.info("   Success: " + success.length);
    }
    if ( warnings.length ) {
      console.info("  Warnings: " + warnings.length);
    }
    if ( errors.length ) {
      console.info("  Failures: " + errors.length);
    }
    console.info("");
  }

  function processWarnings() {
    console.warn("Parser Warnings");
    console.warn("===============");
    for ( var i = 0, len = warnings.length; i < len; i++ ) {
      var warning = warnings[i]
        , warningString = util.formatWarning(warning.err, warning.filePath);

      console.warn(warningString);
      console.warn("");
    }
  }

  function processErrors() {
    console.warn("Parsing Errors");
    console.warn("==============");
    for ( var i = 0, len = errors.length; i < len; i++ ) {
      var error = errors[i]
        , err = util.formatSyntaxError(error.err, error.filePath)
        , errString = err.toString();

      console.warn(errString);
      console.warn("");
    }
  }

  function processBundle() {
    var bundleName = getModuleName(appProperty || path.basename(appFile));
    if ( appFile ) {
      writeAppBundle(appFile, bundleName, appModules, appSandbox);
    }
    if ( jsonFile ) {
      writeJSONBundle(jsonFile, appModules);
    }
  }

  function getArrayArg(argName) {
    var val = args[argName];
    if ( Array.isArray(val) ) {
      return val;
    }
    return val != null ? [val] : [];
  }

  function getValueArg(argName) {
    var val = args[argName];
    if ( Array.isArray(val) ) {
      return val[0];
    }
    return val;
  }
}

// ## Processing Functions

function parseInputTemplate(inputPath) {
  return interpol.parse(fs.readFileSync(inputPath).toString());
}

function writeTemplateJSON(json, outputPath) {
  mkdirp.sync(path.dirname(outputPath));
  fs.writeFileSync(outputPath, JSON.stringify(json));
}

function writeAppBundle(filePath, bundleName, modules, sandbox) {
  var output = [];
  output.push("(function(i){");
  output.push("if(!i)throw Error('Interpol not loaded');");

  output.push("var b={},c={},d='/index',r=i.resolvers()");
  output.push(sandbox ? ".slice(0);" : ";");
  output.push("r.push({");

  // resolveExports
  output.push("resolveExports:");
  output.push("function(n){");
  output.push("var e=c[n];");                 // try to grab it from the cache
  output.push("if(e){return e;}");
  output.push("var m=b[n]||b[n+d];");         // otherwise resolve from modules
  output.push("if(!m){return null;}");
  output.push("return c[n]=m.exports();},");  // cache exports and return

  // resolveModule
  output.push("resolveModule:");
  output.push("function(n){");
  output.push("return b[n]||b[n+d];}");
  output.push("});");

  // Compile the pre-parsed templates
  output.push("var j=" + JSON.stringify(modules) + ";");
  output.push("for(var k in j){");
  output.push("b[k]=i(j[k],{resolvers:r});");
  output.push("}");

  // Finish up
  output.push("i." + bundleName + "=b;");
  output.push("j=null;");

  output.push("})(typeof require==='function'");
  output.push("?require('interpol'):this.$interpol);");

  fs.writeFileSync(filePath, output.join(''));
}

function writeJSONBundle(filePath, modules) {
  fs.writeFileSync(filePath, JSON.stringify(modules));
}

// ## Support Functions

function getModuleName(filePath) {
  var match = ModuleNameRegex.exec(filePath);

  if ( !match ) {
    throw new Error("No module name to be extracted from " + filePath);
  }
  return match[0].replace('\\', '/');
}

function parseArguments(passedArguments) {
  var result = { }
    , argName = null
    , argValue = null;

  for ( var i = 0, len = passedArguments.length; i < len; ) {
    var arg = passedArguments[i++];
    var match = OptionRegex.exec(arg);

    if ( match ) {
      argName = match[1];
      argValue = true;
      result[argName] = argValue;
      continue;
    }

    if ( Array.isArray(argValue) ) {
      argValue.push(arg);
      continue;
    }

    if ( argValue === true ) {
      result[argName] = arg;
    }
    else {
      result[argName] = [argValue, arg];
    }
  }
  return result;
}

function errorOut(message) {
  displayUsage();
  console.error("Error!");
  console.error("");
  console.error("  " + message);
  console.error("");
  process.exit(1);
}

function displayVersion() {
  console.info("Interpol v" + interpol.VERSION);
  console.info("");
}

function displayUsage() {
  displayVersion();
  console.info("Usage:");
  console.info("");
  console.info("  interpol (options)");
  console.info("");
  console.info("Where:");
  console.info("");
  console.info("  Options:");
  console.info("");
  console.info("  -help          - You're looking at me right now");
  console.info("  -in <dirs>     - Locations of templates to parse");
  console.info("  -parse         - Parse only! Don't generate any output");
  console.info("  -out <dir>     - Location of parsed JSON output (or -in dir)");
  console.info("  -files <glob>  - Filename pattern to parse (or **/*.int)");
  console.info("  -ext <ext>     - Filename extension to use (or .json)");
  console.info("  -json <file>   - Generate a JSON application bundle");
  console.info("  -app <file>    - Generate a JavaScript application bundle");
  console.info("    -prop <name> - Property name for the registered bundle");
  console.info("    -sandbox     - Sandbox the application bundle's imports");
  console.info("");
}

// Exported Functions
exports.commandLine = commandLine;

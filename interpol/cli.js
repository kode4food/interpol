#!/usr/bin/env node

/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

// Imports
var fs = require('fs')
  , path = require('path')
  , glob = require('glob')
  , mkdirp = require('mkdirp')
  , interpol = require('./interpol');

var ModuleNameRegex = /^[$_a-zA-Z][$_a-zA-Z0-9\\/]*/
  , OptionRegex = /^-([_a-zA-Z][_a-zA-Z0-9]*)$/;

var slice = Array.prototype.slice;

if ( require.main === module ) {
  commandLine.apply(null, slice.call(process.argv, 2));
}

// Command Line Processing ****************************************************

/**
 * Executes Interpol command-line parsing.  Each argument is treated as it
 * would be had it come from the operating system's shell and should be a
 * string.  This function is normally invoked automatically when the cli.js
 * script is called directly.
 *
 * Example:
 *   commandLine("-in", "./templates", "-out", "./output");
 *
 * @param {...String} [arguments] usage info displayed if an error occurs
 */
function commandLine() {
  var args = parseArguments(arguments)
    , inDir = args.in || process.cwd()
    , outDir = args.out || inDir
    , appFile = args.app || null
    , appProperty = args.prop || null
    , appSandbox = args.sandbox || false
    , appModules = {}
    , pattern = args.files || '**/*.int'
    , ext = args.ext || '.json'
    , files = glob.sync(pattern, { cwd: inDir })
    , success = []
    , errors = [];

  if ( !files.length ) {
    errorOut("No files found matching '" + pattern + "' in " + inDir);
    return;
  }

  for ( var i = 0, len = files.length; i < len; i++ ) {
    var file = files[i]
      , moduleName = getModuleName(file)
      , inputPath = path.join(inDir, file)
      , outputPath = path.join(outDir, file + ext);

    try {
      var result = processFile(inputPath, outputPath)
        , info = result[1];
      success.push(result);
      appModules[moduleName] = info.json;
    }
    catch ( err ) {
      errors.push([inputPath, err]);
    }
  }

  console.info("Interpol Parsing Complete");
  console.info("");
  if ( success.length ) {
    console.info("  Success: " + success.length);
  }
  if ( errors.length ) {
    console.info("  Failure: " + errors.length);
  }
  console.info("");

  if ( errors.length ) {
    console.warn("Parsing Errors");
    console.warn("==============");
    for ( i = 0, len = errors.length; i < len; i++ ) {
      var err = errors[i][1]
        , filePath = errors[i][0]
        , errString = err.toString()
        , lineInfo = " ";

      if ( err.name === 'SyntaxError' ) {
        var unexpected = err.found ? "'" + err.found + "'" : "end of file";
        errString = "Unexpected " + unexpected;
        lineInfo = ":" + err.line + ":" + err.column;
      }

      console.warn(filePath + lineInfo + ": " + errString);
      console.warn("");
    }
  }
  else if ( appFile ) {
    var bundleName = getModuleName(appProperty || path.basename(appFile))
      , bundleStr = JSON.stringify(appModules)
      , output = [];

    output.push("(function(i){");
    output.push("if(!i)throw Error('Interpol not loaded');");

    output.push("var b={},c={},r=i.resolvers()");
    output.push(appSandbox ? ".slice(0);" : ";");
    output.push("r.push({");

    // resolveExports
    output.push("resolveExports:");
    output.push("function(n){");
    output.push("var m=c[n];");
    output.push("if(m){return m;}");
    output.push("return c[n]=b[n].exports();},");

    // resolveModule
    output.push("resolveModule:");
    output.push("function(n){");
    output.push("return b[n];}");
    output.push("});");

    // Compile the pre-parsed templates
    output.push("var j=" + bundleStr + ";");
    output.push("for(var k in j){");
    output.push("b[k]=i(j[k],{resolvers:r});");
    output.push("}");

    // Finish up
    output.push("i." + bundleName + "=b;");
    output.push("j=null;");

    output.push("})(typeof require==='function'");
    output.push("?require('interpol'):this.$interpol);");

    fs.writeFileSync(appFile, output.join(''));
  }

  process.exit(errors.length ? 1 : 0);
}

// Processing Functions *****************************************************

function processFile(inputPath, outputPath) {
  var start = new Date()
    , rawTemplate = fs.readFileSync(inputPath).toString()
    , json = interpol.parse(rawTemplate)
    , output
    , duration;

  mkdirp.sync(path.dirname(outputPath));
  output = JSON.stringify(json);
  fs.writeFileSync(outputPath, output);
  duration = new Date().getTime() - start.getTime();

  return [inputPath, {
    size: output.length,
    duration: duration,
    json: json
  }];
}

// Support Functions ********************************************************

function getModuleName(filePath) {
  var match = ModuleNameRegex.exec(filePath);

  if ( !match ) {
    throw new Error("No module name to be extracted from " + filePath);
  }
  return match[0].replace('\\', '/');
}

function parseArguments(passedArguments) {
  var result = { };
  for ( var i = 0, len = passedArguments.length; i < len; ) {
    var arg = passedArguments[i++];
    var match = OptionRegex.exec(arg);
    if ( match ) {
      var argName = match[1]
        , argValue = true;
      if ( i < len && !OptionRegex.test(passedArguments[i]) ) {
        argValue = passedArguments[i++];
      }
      result[argName] = argValue;
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
  console.info("  -in <dir>      - Location of templates to parse (or $CWD)");
  console.info("  -out <dir>     - Location of parsed JSON output (or -in dir)");
  console.info("  -files <glob>  - Filename pattern to parse (or **/*.int)");
  console.info("  -ext <ext>     - Filename extension to use (or .json)");
  console.info("  -app <file>    - Generate a single-file application bundle");
  console.info("    -prop <name> - Property name for the registered bundle");
  console.info("    -sandbox     - Sandbox the application bundle's imports");
  console.info("");
}

// Exports
exports.commandLine = commandLine;

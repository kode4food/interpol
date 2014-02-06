#!/usr/bin/env node

/*!
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

// Imports
var fs = require('fs')
  , path = require('path')
  , glob = require('glob')
  , mkdirp = require('mkdirp')
  , interpol = require('./interpol');

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
  "use strict";

  var args = parseArguments(arguments)
    , inDir = args.in || process.cwd()
    , outDir = args.out || inDir
    , pattern = args.files || '*.int'
    , ext = args.ext || '.json'
    , files = glob.sync(pattern, { cwd: inDir })
    , success = []
    , errors = [];

  if ( !files.length ) {
    errorOut("No files found matching '" + pattern + "' in " + inDir);
    return;
  }

  for ( var i = 0, len = files.length; i < len; i++ ) {
    var inputPath = path.join(inDir, files[i])
      , outputPath = path.join(outDir, files[i] + ext);

    try {
      var info = processFile(inputPath, outputPath);
      success.push([inputPath, info]);
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
        lineInfo = ":" + err.line + ":" + err.column;
      }

      console.warn(filePath + lineInfo + ": " + errString);
      console.warn("");
    }
  }

  process.exit(errors.length ? 1 : 0);

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

    return [inputPath, { size: output.length, duration: duration }];
  }

  // Support Functions ********************************************************

  function parseArguments(passedArguments) {
    var optionRegex = /^-([a-zA-Z_][a-zA-Z_0-9]*)$/
      , result = { };

    for ( var i = 0, len = passedArguments.length; i < len; ) {
      var arg = passedArguments[i++];
      var match = optionRegex.exec(arg);
      if ( match ) {
        var argName = match[1]
          , argValue = i < len ? passedArguments[i++] : null;
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
    console.info("  -in <dir> - Location of templates to parse (or $CWD)");
    console.info("  -out <dir> - Location of parsed JSON output (or -in dir)");
    console.info("  -files <glob> - Filename pattern to parse (or *.int)");
    console.info("  -ext <ext> - Filename extension to use (or .json)");
    console.info("");
  }
}

// Exports
exports.commandLine = commandLine;

#!/usr/bin/env node

/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var fs = require('fs');
var path = require('path');
var glob = require('glob');
var mkdirp = require('mkdirp');
var interpol = require('./index');
var util = require('./util');
var parser = require('./compiler/parser');
var js = require('./compiler/javascript');

var ModuleNameRegex = /^[$_a-zA-Z][$_a-zA-Z0-9\\/]*/;
var OptionRegex = /^-([a-zA-Z][_a-zA-Z0-9]*)$/;

var slice = Array.prototype.slice;
var each = util.each;
var generateNodeModule = util.generateNodeModule;
var formatSyntaxError = parser.formatSyntaxError;
var formatWarning = parser.formatWarning;

/* istanbul ignore if */
if ( require.main === module ) {
  commandLine(slice.call(process.argv, 2), process.exit);
}

// Command Line Processing

/**
 * Executes Interpol command-line parsing.  This function is normally
 * invoked automatically when the cli.js script is called directly.
 *
 * Example:
 *
 *     commandLine("-in", "./templates", "-out", "./output");
 *
 * @param {String[]} passedArguments string arguments (passed from shell)
 * @param {Object} [console] A console object for output
 * @param {function} [exitCallback] callback for exit code (no err)
 */
function commandLine(passedArguments, console, exitCallback) {
  if ( typeof console === 'function' ) {
    exitCallback = console;
    console = global.console;
  }
  if ( typeof exitCallback !== 'function' ) {
    exitCallback = function () {};
  }

  var args = parseArguments(passedArguments);
  var inDirs = getArrayArg('in');

  if ( args.help || !inDirs.length ) {
    displayUsage();
    exitCallback(0);
    return;
  }

  var parseOnly = getValueArg('parse') || false;
  var bundleFile = (!parseOnly && getValueArg('bundle')) || null;
  var skipWrite = bundleFile || parseOnly;
  var bundleProperty = getValueArg('prop') || null;
  var bundleSandbox = getValueArg('sandbox') || false;
  var globals = bundleFile ? js.createGlobals() : null;
  var bundleModules = {};
  var pattern = getValueArg('files') || '**/*.int';
  var ext = getValueArg('ext') || '.js';
  var success = [];
  var errors = [];
  var warnings = [];

  try {
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
    else if ( bundleFile ) {
      // Otherwise generate a bundle if requested
      processBundle();
    }
    // Done!
    exitCallback(errors.length ? 1 : 0);
  }
  catch ( err ) {
    errorOut(err);
  }

  function processDirectories() {
    each(inDirs, processDirectory);
  }

  function processDirectory(inDir) {
    var outDir = getValueArg('out') || inDir;
    var files = glob.sync(pattern, { cwd: inDir });

    if ( !files.length ) {
      throw "No files found matching '" + pattern + "' in " + inDir;
    }

    each(files, function (file) {
      var moduleName = getModuleName(file);
      var inputPath = path.join(inDir, file);

      try {
        var compileResult = compileInputTemplate(inputPath);
        var compileWarnings = compileResult.err || [];

        each(compileWarnings, function (compileWarning) {
          warnings.push({ filePath: inputPath, err: compileWarning });
        });

        var templateBody = compileResult.templateBody;
        if ( skipWrite ) {
          bundleModules[moduleName] = templateBody;
        }
        else {
          writeNodeModule(templateBody, path.join(outDir, file + ext));
        }

        success.push({ filePath: inputPath });
      }
      catch ( err ) {
        errors.push({ filePath: inputPath, err: err });
      }
    });
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
    each(warnings, function (warning) {
      var warningString = formatWarning(warning.err, warning.filePath);
      console.warn(warningString);
      console.warn("");
    });
  }

  function processErrors() {
    console.warn("Parsing Errors");
    console.warn("==============");
    each(errors, function (error) {
      var err = formatSyntaxError(error.err, error.filePath);
      var errString = err.toString();

      console.warn(errString);
      console.warn("");
    });
  }

  function processBundle() {
    var bundleName = getModuleName(bundleProperty || path.basename(bundleFile));
    if ( bundleFile ) {
      writeBundle(bundleFile, bundleName, bundleModules, bundleSandbox);
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

  // Processing Functions

  function compileInputTemplate(inputPath) {
    var intContent = fs.readFileSync(inputPath).toString();
    return interpol.compile(intContent, { globals: globals });
  }

  function writeNodeModule(jsContent, outputPath) {
    mkdirp.sync(path.dirname(outputPath));
    fs.writeFileSync(outputPath, generateNodeModule(jsContent));
  }

  function writeBundle(filePath, bundleName, modules, sandbox) {
    var output = [];
    output.push("(function($i){");
    output.push("if(!$i){throw new Error('Interpol not loaded');}");

    output.push("var $b={},$c={},$d='/index',$r=$i.resolvers()");
    output.push(sandbox ? ".slice(0);" : ";");
    output.push("$r.push({");

    // resolveExports
    output.push("resolveExports:");
    output.push("function($n){");
    output.push("var $e=$c[$n];");                 // try to grab it from cache
    output.push("if($e){return $e;}");
    output.push("var $m=$b[$n]||$b[$n+$d];");      // or resolve from modules
    output.push("if(!$m){return null;}");
    output.push("return $c[$n]=$m.exports();},");  // cache exports and return

    // resolveModule
    output.push("resolveModule:");
    output.push("function($n){");
    output.push("return $b[$n]||$b[$n+$d];}");
    output.push("});");

    // Generate the pre-compiled templates
    output.push("(function($b, r){");
    output.push(globals.toString());
    for ( var moduleName in modules ) {
      output.push("$b[" + JSON.stringify(moduleName) + "]=(function(){");
      output.push(modules[moduleName]);
      output.push("})();");
    }
    output.push("})($b,$i.runtime({resolvers:$r}));");

    // Finish up
    output.push("$i[" + JSON.stringify(bundleName) + "]=$b;");

    output.push("})(typeof require==='function'");
    output.push("?require('interpol'):this.interpol);");

    fs.writeFileSync(filePath, output.join(''));
  }

  // Support Functions

  function getModuleName(filePath) {
    var match = ModuleNameRegex.exec(filePath);

    if ( !match ) {
      throw new Error("No module name to be extracted from " + filePath);
    }
    return match[0].replace('\\', '/');
  }

  function parseArguments(passedArguments) {
    var result = {};
    var argName = null;
    var argValue = null;

    each(passedArguments, function (arg) {
      var match = OptionRegex.exec(arg);

      if ( match ) {
        argName = match[1];
        argValue = true;
        result[argName] = argValue;
        return;
      }

      if ( Array.isArray(argValue) ) {
        argValue.push(arg);
        return;
      }

      if ( argValue === true ) {
        result[argName] = arg;
      }
      else {
        result[argName] = [argValue, arg];
      }
    });
    return result;
  }

  function errorOut(message) {
    displayUsage();
    console.error("Error!");
    console.error("");
    console.error("  " + message);
    console.error("");
    exitCallback(1);
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
    console.info("  -out <dir>     - Location of compiled JSON output (or -in dir)");
    console.info("  -files <glob>  - Filename pattern to parse (or **/*.int)");
    console.info("  -ext <ext>     - Filename extension to use (or .js)");
    console.info("  -bundle <file> - Generate a Browser application bundle");
    console.info("    -prop <name> - Property name for the registered bundle");
    console.info("    -sandbox     - Sandbox the application bundle's imports");
    console.info("");
  }
}

// Exported Functions
exports.commandLine = commandLine;

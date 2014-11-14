/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');
var types = require('./types');
var compiler = require('./compiler/stub');
var runtime = require('./runtime');

var isArray = util.isArray;
var bless = types.bless;

var createRuntime = runtime.createRuntime;
var compileModule = null;
var generateFunction = null;

var CURRENT_VERSION = "0.9.4";

var slice = Array.prototype.slice;

// Bootstrap

interpol.VERSION = CURRENT_VERSION;
interpol.bless = bless;
interpol.evaluate = evaluate;
interpol.compile = compile;
interpol.runtime = getRuntime;
interpol.options = runtime.options;
interpol.context = runtime.context;
interpol.resolvers = runtime.resolvers;

// Core Interpol Implementation

var globalRuntime = createRuntime();


/**
 * Main Interpol entry point.  Takes a template and returns a closure
 * for rendering it.  The template must be a String.
 *
 * @param {String} template the template to be compiled
 * @param {Runtime} [runtime] Runtime Instance (or config Object)
 */
function interpol(template, runtime) {
  runtime = getRuntime(runtime);
  var options = runtime.options;

  var compiledOutput = null;
  if ( typeof template === 'string' ) {
    compiledOutput = compile(template, options).templateBody;
  }
  else {
    throw new Error("template must be a String");
  }

  var wrapper = generateFunction(compiledOutput);
  return wrapper(runtime);
}

/**
 * Convenience function to compile and execute a template against a context
 * Object and options.  Not generally recommended.
 */
function evaluate(script, obj, options) {
  var compiled = interpol(script, options);
  return compiled(obj, options);
}

/**
 * Invokes the Interpol compiler against the specified template and produces
 * an Object that includes the compiled template generator and any errors or
 * warnings.  The compiler module has to be loaded for this to work.
 *
 * @param {String} template the Interpol Template to be compiled
 */
function compile(template, options) {
  if ( !compileModule ) {
    if ( typeof compiler.compileModule !== 'function' ) {
      throw new Error("The Interpol compiler was never loaded");
    }
    compileModule = compiler.compileModule;
    generateFunction = compiler.generateFunction;
  }
  return compileModule(template, options);
}

/**
 * Returns a new Runtime based on the provided options.  If no options are
 * provided, will return the global Runtime instance.
 *
 * @param {Object} [options] configuration Object
 */
function getRuntime(options) {
  if ( !options ) {
    return globalRuntime;
  }
  return createRuntime(options);
}

// Exported Functions
module.exports = interpol;

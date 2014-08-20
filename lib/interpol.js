/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');
var runtime = require('./runtime');

var isArray = util.isArray;
var bless = util.bless;
var isInterpolJSON = util.isInterpolJSON;
var buildRuntime = runtime.buildRuntime;

var CURRENT_VERSION = "0.4.1";
var compileModule = null;

var slice = Array.prototype.slice;

// ## Bootstrap

interpol.VERSION = CURRENT_VERSION;
interpol.bless = bless;
interpol.evaluate = evaluate;
interpol.compile = compile;
interpol.runtime = runtime.buildRuntime;
interpol.options = runtime.options;
interpol.globals = runtime.globals;
interpol.resolvers = runtime.resolvers;

// ## Core Interpol Implementation

/**
 * Main Interpol entry point.  Takes a template and returns a closure
 * for rendering it.  The template can either be an unparsed String or
 * a pre-compiled JSON Object.
 *
 * @param {String|Object} template the template to be compiled
 * @param {Object} [options] configuration Object passed to the compile step
 */

function interpol(template, options) {
  var compiledOutput = null;
  if ( isInterpolJSON(template) ) {
    compiledOutput = template;
  }
  else if ( typeof template === 'string' ) {
    compiledOutput = compile(template);
  }
  else {
    throw new Error("template must be a String or JSON Object");
  }
  return buildRuntime(compiledOutput, options);
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
 * a JSON instance.  The compiler module has to be loaded for this to work.
 *
 * @param {String} template the Interpol Template to be compiled
 */

function compile(template) {
  if ( !compileModule ) {
    if ( typeof interpol.compileModule !== 'function' ) {
      throw new Error("The Interpol compiler was never loaded");
    }
    compileModule = interpol.compileModule;
  }
  var result = compileModule(template);
  result.v = CURRENT_VERSION;
  return result;
}

// Exported Functions
module.exports = interpol;

/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var compiler = require('./compiler');
var compileModule = compiler.compileModule;
var generateFunction = compiler.generateFunction;

var util = require('./util');
var isArray = util.isArray;

var namespace = require('./namespace');
var interpol = namespace.configureNamespace(processTemplate);
interpol.evaluate = evaluate;
interpol.compile = compileModule;

/**
 * Main Interpol entry point.  Takes a template and returns a closure
 * for rendering it.  The template must be a String.
 *
 * @param {String} template the template to be compiled
 * @param {Runtime} [runtime] Runtime Instance (or config Object)
 */
function processTemplate(template, runtime) {
  if ( typeof template !== 'string' ) {
    throw new Error("template must be a string");
  }

  runtime = interpol.getRuntime(runtime);
  var options = runtime.options;

  var compiledOutput = compileModule(template, options).templateBody;
  var wrapper = generateFunction(compiledOutput);
  return wrapper(runtime);
}

/**
 * Convenience function to compile and execute a template against a context
 * Object and options.  Not generally recommended.
 */
function evaluate(script, obj, options) {
  var compiled = processTemplate(script, options);
  return compiled(obj, options);
}

// Exported Functions
module.exports = interpol;

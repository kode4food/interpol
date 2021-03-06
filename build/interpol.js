(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

// This module is used to collect the requirements for a minimal
// Browserify build.  It's of no interest to node.js

// Set the Interpol browser global
var interpol = window.interpol = require('../lib/interpol');

// Register the Writers for easier access
var writers = require('../lib/writers');
interpol.createNullWriter = writers.createNullWriter;
interpol.createStringWriter = writers.createStringWriter;

},{"../lib/interpol":4,"../lib/writers":17}],2:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

/**
 * This is a stub that will be populated by the 'real' compiler functionality
 * should it be loaded by either node.js or Browserify.  It's here because
 * we shouldn't have to rely on Browserify's `--ignore` option.
 */

},{}],3:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');
var types = require('./types');

var objectKeys = util.objectKeys;
var each = util.each;
var stringify = types.stringify;
var isInterpolFunction = types.isInterpolFunction;

var Digits = "0|[1-9][0-9]*";
var Ident = "[$_a-zA-Z][$_a-zA-Z0-9]*";
var Pipes = "([|]" + Ident + ")*";
var Term = ";?";
var Params = "%((%)|(" + Digits + ")|(" + Ident + "))?(" + Pipes + ")?" + Term;
             /* "%" ( "%" | digits | identifier )? ( "|" identifier )* ";"? */

var ParamRegex = new RegExp(Params, "m");

var nullWriter = require('./writers/null').createNullWriter();

/**
 * Builds a closure that will be used internally to support Interpol's
 * interpolation operations.  The returned closure will attach flags
 * that identify any names or indexes that must be provided by interpol
 * to fulfill its formatting.
 *
 * @param {String} formatStr the String to be used for interpolation
 */
function buildFormatter(formatStr) {
  var components = [];
  var requiredIndexes = {};
  var requiredFunctions = {};
  var clen = 0;
  var autoIdx = 0;

  var workStr = formatStr;
  while ( workStr && workStr.length ) {
    var paramMatch = ParamRegex.exec(workStr);
    if ( !paramMatch ) {
      components.push(createLiteralComponent(workStr));
      break;
    }

    var match = paramMatch[0];
    var matchIdx = paramMatch.index;
    var matchLen = match.length;

    if ( matchIdx ) {
      components.push(createLiteralComponent(workStr.substring(0, matchIdx)));
    }

    if ( paramMatch[2] === '%' ) {
      components.push(createLiteralComponent('%'));
      workStr = workStr.substring(matchIdx + matchLen);
      continue;
    }

    var idx = autoIdx++;
    if ( paramMatch[4] ) {
      idx = paramMatch[4];
    }
    else if ( paramMatch[3] ) {
      idx = parseInt(paramMatch[3], 10);
    }
    requiredIndexes[idx] = true;

    if ( paramMatch[5] ) {
      var formatters = paramMatch[5].slice(1).split('|');
      components.push(createPipedComponent(idx, formatters));
    }
    else {
      components.push(createIndexedComponent(idx));
    }

    workStr = workStr.substring(matchIdx + matchLen);
  }
  clen = components.length;

  formatFunction.__intRequiredIndexes = objectKeys(requiredIndexes);
  formatFunction.__intRequiredFunctions = objectKeys(requiredFunctions);
  formatFunction.toString = toString;
  return formatFunction;

  function toString() {
    return formatStr;
  }

  function formatFunction(supportFunctions, writer, data) {
    if ( typeof data !== 'object' || data === null ) {
      data = [data];
    }

    var result = '';
    for ( var i = 0; i < clen; i++ ) {
      var component = components[i];
      switch ( component[0] ) {
        case 0: result += component[1]; break;
        case 1: result += stringify(data[component[1]]); break;
        case 2: result += component[1](data, supportFunctions);
      }
    }
    return result;
  }

  function createLiteralComponent(literal) {
    return [0, literal];
  }

  function createIndexedComponent(idx) {
    return [1, idx];
  }

  function createPipedComponent(idx, formatters) {
    var funcs = formatters.reverse();
    var flen = funcs.length - 1;

    // Register requirement on these formatters
    each(funcs, function (funcName) {
      requiredFunctions[funcName] = true;
    });

    return [2, pipedFunction];

    function pipedFunction(data, supportFunctions) {
      var value = data[idx];
      for ( var i = flen; i >= 0; i-- ) {
        var funcName = funcs[i];
        var func = supportFunctions[funcName];

        if ( !isInterpolFunction(func) ) {
          if ( supportFunctions.__intExports ) {
            continue;
          }
          throw new Error("Attempting to call an unblessed function");
        }

        value = func(nullWriter, value);
      }
      return stringify(value);
    }
  }
}

function buildDeferredFormatter(formatStr, supportFunctions) {
  var formatter = buildFormatter(formatStr);
  supportedFormatter.__intFunction = 'format';
  supportedFormatter.toString = formatter.toString;
  if ( supportFunctions !== undefined ) {
    return supportedFormatter;
  }
  return deferredFormatter;

  function supportedFormatter(writer, data) {
    return formatter(supportFunctions, writer, data);
  }
  
  function deferredFormatter(_supportFunctions) {
    supportFunctions = _supportFunctions;
    return supportedFormatter;
  }
}

function buildImmediateFormatter(formatStr, supportFunctions) {
  var formatter = buildFormatter(formatStr);
  if ( supportFunctions !== undefined ) {
    return supportedFormatter;
  }
  return immediateFormatter;

  function supportedFormatter(data) {
    return formatter(supportFunctions, undefined, data);
  }
  
  function immediateFormatter(supportFunctions, data) {
    return formatter(supportFunctions, undefined, data);
  }
}

// Exported Functions
exports.buildFormatter = buildFormatter;
exports.buildDeferredFormatter = buildDeferredFormatter;
exports.buildImmediateFormatter = buildImmediateFormatter;

},{"./types":15,"./util":16,"./writers/null":18}],4:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
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
var compileModule;
var generateFunction;

var CURRENT_VERSION = "1.6.0";

// Bootstrap

interpol.VERSION = CURRENT_VERSION;
interpol.bless = bless;
interpol.evaluate = evaluate;
interpol.compile = compile;
interpol.runtime = getRuntime;
interpol.stopIteration = types.stopIteration;

// Core Interpol Implementation

var globalRuntime = createRuntime(interpol);

/**
 * Main Interpol entry point.  Takes a template and returns a closure
 * for rendering it.  The template must be a String.
 *
 * @param {String} template the template to be compiled
 * @param {Runtime} [runtime] Runtime Instance (or config Object)
 */
function interpol(template, runtime) {
  if ( typeof template !== 'string' ) {
    throw new Error("template must be a string");
  }

  runtime = getRuntime(runtime);
  var options = runtime.options;

  var compiledOutput = compile(template, options).templateBody;
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
  return createRuntime(interpol, options);
}

// Exported Functions
module.exports = interpol;

},{"./compiler/stub":2,"./runtime":14,"./types":15,"./util":16}],5:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');
var isArray = util.isArray;
var objectKeys = util.objectKeys;

/**
 * Basic Object Matcher to support the `like` operator.
 *
 * @param {Mixed} template the Template to match against
 * @param {Mixed} obj the Object being inspected
 */
function isMatchingObject(template, obj) {
  if ( template === null || template === undefined ) {
    return obj === null || obj === undefined;
  }

  if ( typeof template !== 'object' ) {
    return template === obj;
  }

  if ( isArray(template) ) {
    if ( !isArray(obj) || obj.length < template.length ) {
      return false;
    }

    for ( var i = 0, len = template.length; i < len; i++ ) {
      if ( !isMatchingObject(template[i], obj[i]) ) {
        return false;
      }
    }

    return true;
  }

  if ( typeof obj !== 'object' || obj === null ) {
    return false;
  }

  for ( var key in template ) {
    if ( !isMatchingObject(template[key], obj[key]) ) {
      return false;
    }
  }
  return true;
}

/**
 * Compiled matcher, for when the template has been defined as a literal.
 *
 * @param {Mixed} template the Template to match against
 */
function buildMatcher(template) {
  if ( template === null || template === undefined ) {
    return nullMatcher;
  }
  if ( typeof template !== 'object' ) {
    return valueMatcher;
  }
  if ( isArray(template) ) {
    return buildArrayMatcher(template);
  }
  return buildObjectMatcher(template);

  function nullMatcher(obj) {
    return obj === null || obj === undefined;
  }

  function valueMatcher(obj) {
    return template === obj;
  }
}

function buildArrayMatcher(template) {
  var matchers = [];
  var mlen = template.length;

  for ( var i = 0; i < mlen; i++ ) {
    matchers.push(buildMatcher(template[i]));
  }
  return arrayMatcher;

  function arrayMatcher(obj) {
    if ( template === obj ) {
      return true;
    }
    if ( !isArray(obj) || obj.length < mlen ) {
      return false;
    }
    for ( var i = 0; i < mlen; i++ ) {
      if ( !matchers[i](obj[i]) ) {
        return false;
      }
    }
    return true;
  }
}

function buildObjectMatcher(template) {
  var matchers = [];
  var keys = objectKeys(template);
  var mlen = keys.length;

  for ( var i = 0; i < mlen; i++ ) {
    matchers.push(buildMatcher(template[keys[i]]));
  }
  return objectMatcher;

  function objectMatcher(obj) {
    if ( template === obj ) {
      return true;
    }
    if ( typeof obj !== 'object' || obj === null ) {
      return false;
    }
    for ( var i = 0; i < mlen; i++ ) {
      if ( !matchers[i](obj[keys[i]]) ) {
        return false;
      }
    }
    return true;
  }
}

// Exported Functions
exports.matches = isMatchingObject;
exports.matcher = buildMatcher;

},{"./util":16}],6:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var memory = require('./memory');
var system = require('./system');

// Exported Functions
exports.createMemoryResolver = memory.createMemoryResolver;
exports.createSystemResolver = system.createSystemResolver;

},{"./memory":7,"./system":9}],7:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../types');
var util = require('../util');

var isInterpolModule = types.isInterpolModule;
var isArray = util.isArray;
var bless = types.bless;

/**
 * Creates a new MemoryResolver.  As its name implies, this resolver
 * allows one to register a module to be stored in memory.  A default
 * instance of this resolver is used to store the System Modules.
 * Because of its flexibility, it can also be used to store custom
 * modules and native JavaScript helpers.
 *
 * @param {Runtime} [runtime] Runtime owner for MemoryResolver
 * @param {boolean} [addRuntimeEntries] whether to add registerModule
 */
function createMemoryResolver(runtime, addRuntimeEntries) {
  var interpol = runtime.interpol;
  var cache = {};

  var resolver = {
    resolveModule: resolveModule,
    resolveExports: resolveExports,
    unregisterModule: unregisterModule,
    registerModule: registerModule
  };

  runtime.resolvers().push(resolver);
  if ( addRuntimeEntries ) {
    runtime.registerModule = registerModule;
    runtime.unregisterModule = unregisterModule;
  }
  return resolver;

  function resolveModule(name) {
    var result = cache[name];
    return result ? result.module : undefined;
  }

  function resolveExports(name) {
    var result = cache[name];
    if ( !result ) {
      return undefined;
    }

    if ( result.moduleExports ) {
      return result.moduleExports;
    }

    var moduleExports = result.moduleExports = result.module.exports();
    return moduleExports;
  }

  /**
   * Removes a module from the resolver cache.
   *
   * @param {String} name the name of the module to remove
   */
  function unregisterModule(name) {
    delete cache[name];
  }

  /**
   * Registers a module in the module cache.
   *
   * @param {String} name the name of the module to be registered
   * @param {Function|String|Object} module the module to register
   */
  function registerModule(name, module) {
    // A compiled Interpol Module function
    if ( isInterpolModule(module) ) {
      cache[name] = { module: module };
      return;
    }

    // *String* - An unparsed Interpol template
    if ( typeof module === 'string' ) {
      cache[name] = { module: interpol(module) };
      return;
    }

    // *Object* - A hash of Helpers (name->Function)
    if ( typeof module === 'object' && module !== null && !isArray(module) ) {
      cache[name] = { module: createModuleStub(module) };
      return;
    }

    throw new Error("Module not provided");
  }
}

/**
 * Creates a 'blessed' module where are Functions are made to be both
 * Interpol-compatible and configurable.
 *
 * @param {Object} module the Module to bless
 */
function blessModule(module) {
  var result = {};
  for ( var key in module ) {
    var value = module[key];
    if ( typeof value === 'function') {
      result[key] = bless(value);
    }
    else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Takes a hash of Functions, blesses them, and creates a stub module for
 * them that can be returned by the `resolveModule()` call.
 *
 * @param {Object} moduleExports the hash of Functions to stub
 */
function createModuleStub(moduleExports) {
  moduleExports = blessModule(moduleExports);
  templateInterface.__intModule = true;
  templateInterface.exports = templateExports;
  return templateInterface;

  function templateInterface() {
    return '';
  }

  function templateExports() {
    return moduleExports;
  }
}

// Exported Functions
exports.createMemoryResolver = createMemoryResolver;

},{"../types":15,"../util":16}],8:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../../types');
var bless = types.bless;

var slice = Array.prototype.slice;

/**
 * Wraps a Function in an envelope that accepts a Writer (but discards it).
 *
 * @param {Function} func the Function to wrap
 */
function wrap(func) {
  return bless(wrappedFunction);

  function wrappedFunction(writer) {
    /* jshint validthis:true */
    return func.apply(this, slice.call(arguments, 1));
  }
}

// Exported Functions
exports.wrap = wrap;

},{"../../types":15}],9:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var memory = require('../memory');

var math = require('./math');
var list = require('./list');
var render = require('./render');
var string = require('./string');

var createMemoryResolver = memory.createMemoryResolver;

function createSystemResolver(runtime) {
  var resolver = createMemoryResolver(runtime);

  resolver.registerModule('math', math);
  resolver.registerModule('list', list);
  resolver.registerModule('render', render);
  resolver.registerModule('string', string);

  delete resolver.registerModule;
  delete resolver.unregisterModule;

  runtime.resolvers().push(resolver);
  return resolver;
}

// Exported Functions
exports.createSystemResolver = createSystemResolver;

},{"../memory":7,"./list":10,"./math":11,"./render":12,"./string":13}],10:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../../util');
var types = require('../../types');

var objectKeys = util.objectKeys;
var isArray = util.isArray;

// `first(value)` returns the first item of the provided array (or `null` if
// the array is empty).
function first(writer, value) {
  if ( isArray(value) ) {
    return value[0];
  }
  if ( typeof value === 'object' && value !== null ) {
    var name = objectKeys(value)[0];
    var val = value[name];
    return {
        name: name,
        value: val === null ? undefined : val
    };
  }
  return value;
}

// `join(delim, value)` returns the result of joining the elements of the
// provided array. Each element will be concatenated into a string separated
// by the specified delimiter (or ' ').
function join(writer, delim, value) {
  if ( value === undefined ) {
    value = delim;
    delim = ' ';
  }
  if ( isArray(value) ) {
    return value.join(delim);
  }
  return value;
}

// `last(value)` returns the last item of the provided array (or `nil` if
// the array is empty).
function last(writer, value) {
  if ( isArray(value) ) {
    return value[value.length - 1];
  }
  if ( typeof value === 'object' && value !== null ) {
    var keys = objectKeys(value);
    var name = keys[keys.length - 1];
    var val = value[name];
    return {
        name: name,
        value: val === null ? undefined : val
    };
  }
  return value;
}

// `length(value)` if it is an array, returns the length of the provided
// value, if an object, the number of keys, otherwise `0`.
function length(writer, value) {
  if ( isArray(value) ) {
    return value.length;
  }
  if ( typeof value === 'object' && value !== null ) {
    return objectKeys(value).length;
  }
  return 0;
}

// `empty(value)` returns true or false depending on whether or not the
// provided array is empty.
function empty(writer, value) {
  return length(writer, value) === 0;
}

// `keys(value)` returns the keys of the Object or indexes of the Array
// passed to it.  If the Array is sparse (has gaps) it will only return
// the indexes with assigned values.
function keys(writer, value) {
  if ( typeof value === 'object' && value !== null ) {
    return objectKeys(value);
  }
  return undefined;
}

// values(value)` returns the values of the Object or Array passed to
// it.  If the array is sparse (has gaps) it will only return the
// assigned values.
function values(writer, value) {
  if ( typeof value !== 'object' || value === null ) {
    return undefined;
  }
  var keys = objectKeys(value);
  var result = [];
  for ( var i = 0, len = keys.length; i < len; i++ ) {
    result[i] = value[keys[i]];
  }
  return result;
}

// Exports
exports.first = first;
exports.join = join;
exports.last = last;
exports.length = length;
exports.empty = empty;
exports.keys = keys;
exports.values = values;

},{"../../types":15,"../../util":16}],11:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../../util');
var isArray = util.isArray;

var types = require('../../types');
var bless = types.bless;
var stopIteration = types.stopIteration;

var helpers = require('./helpers');
var wrap = helpers.wrap;

function numberSort(left, right) {
  return left > right;
}

// `range(start, end)` creates an integer range generator
function range(writer, start, end) {
  start = Math.floor(start);
  end = Math.floor(end);
  var increment = end > start ? 1 : -1;
  return bless(rangeInstance, 'gen');
  
  function rangeInstance() {
    if ( start === stopIteration ) {
      return stopIteration;
    }
    var result = start;
    if ( start === end ) {
      start = stopIteration;
    }
    else {
      start += increment;
    }
    return result;
  }
}

// `avg(value)` if an Array, returns the average (mathematical mean) of
// value's elements
function avg(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  if ( value.length === 0 ) {
    return 0;
  }
  for ( var i = 0, r = 0, l = value.length; i < l; r += value[i++] );
  return r / l;
}

// `max(value)` if an Array, return the greatest value in it
function max(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  return Math.max.apply(Math, value);
}

// `median(value)` if an Array, return the mathematical median of
// value's elements
function median(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  if ( value.length === 0 ) {
    return 0;
  }
  var temp = value.slice(0).sort(numberSort);
  if ( temp.length % 2 === 0 ) {
    var mid = temp.length / 2;
    return (temp[mid - 1] + temp[mid]) / 2;
  }
  return temp[((temp.length + 1) / 2) - 1];
}

// `min(value)` if an Array, return the lowest value in it
function min(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  return Math.min.apply(Math, value);
}

// `sum(value)` if an Array, return the mathematical sum of value's
// elements
function sum(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  for ( var i = 0, res = 0, l = value.length; i < l; res += value[i++] );
  return res;
}

// Math functions

// `number(value)` convert value to a Number
exports.number = wrap(Number);
// `abs(value)` returns the absolute value
exports.abs = wrap(Math.abs);
// `acos(value)` returns the arc-cosine of value (in radians)
exports.acos = wrap(Math.acos);
// `asin(value)` returns the arc-sine of value (in radians)
exports.asin = wrap(Math.asin);
// `atan(value)` returns the arc-tangent of value (in radians)
exports.atan = wrap(Math.atan);
// `atan2(x,y)` returns the arc-tangent of the coords
exports.atan2 = wrap(Math.atan2);
// `ceil(value)` rounds to the next highest integer
exports.ceil = wrap(Math.ceil);
// `cos(value)` returns the cosine of value (in radians)
exports.cos = wrap(Math.cos);
// `exp(x)` returns E to the power of x
exports.exp = wrap(Math.exp);
// `floor(value)` rounds to the next lowest integer
exports.floor = wrap(Math.floor);
// `log(value)` returns the natural logarithm
exports.log = wrap(Math.log);
// `pow(x,y)` returns x raised to the power of y
exports.pow = wrap(Math.pow);
// `random()` returns a random number (0 <= x < 1)
exports.random = wrap(Math.random);
// `round(value)` rounds up or down to the closest integer
exports.round = wrap(Math.round);
// `sin(value)` returns the sine of value (in radians)
exports.sin = wrap(Math.sin);
// `sqrt(value)` returns the square root
exports.sqrt = wrap(Math.sqrt);
// `tan(value)` returns the tangent of value (in radians)
exports.tan = wrap(Math.tan);

// ### Constants

// `E` is Euler's Number
exports.E = Math.E;
// `LN2` is the Natural Logarithm of 2
exports.LN2 = Math.LN2;
// `LN10` is the Natural Logarithm of 10
exports.LN10 = Math.LN10;
// `LOG2E` is the Base-2 Logarithm of E
exports.LOG2E = Math.LOG2E;
// `LOG10E` is the Base-10 Logarithm of E
exports.LOG10E = Math.LOG10E;
// `PI` is Pi
exports.PI = Math.PI;
// `SQRT1_2` is the Square Root of 1/2
exports.SQRT1_2 = Math.SQRT1_2;
// `SQRT2` is the Square Root of 2
exports.SQRT2 = Math.SQRT2;

// Exported Functions
exports.range = range;
exports.avg = avg;
exports.max = max;
exports.median = median;
exports.min = min;
exports.sum = sum;

},{"../../types":15,"../../util":16,"./helpers":8}],12:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../../types');
var bless = types.bless;
var isInterpolFunction = types.isInterpolFunction;

var noOp = bless(function () {});

function counter(writer, start, increment) {
  if ( typeof start !== 'number' || isNaN(start) ) {
    start = 0;
  }
  if ( typeof increment !== 'number' || isNaN(increment) ) {
    increment = 1;
  }
  return bless(counterInstance);

  function counterInstance() {
    var result = start;
    start += increment;
    return result;
  }
}

function evenOdd(writer, even, odd) {
  if ( even === undefined ) {
    even = 'even';
  }
  if ( odd === undefined ) {
    odd = 'odd';
  }

  var current = true;
  return bless(evenOddInstance);

  function evenOddInstance() {
    current = !current;
    return current ? odd : even;
  }
}

function separator(writer, sep) {
  var empty = '';
  if ( sep === undefined ) {
    sep = ', ';
  }
  else if ( typeof sep === 'function' ) {
    empty = noOp;
  }

  var first = true;
  return bless(separatorInstance);

  function separatorInstance() {
    if ( first ) {
      first = false;
      return empty;
    }
    return sep;
  }
}

function pluralizer(writer, singular, plural) {
  var idx = isInterpolFunction(singular) ? 1 : 0;
  if ( plural === undefined && !idx ) {
    plural = singular + 's';
  }

  idx += isInterpolFunction(plural) ? 2 : 0;
  return bless([neither, singularOnly, pluralOnly, both][idx]);

  function neither(writer, value) {
    return value === 1 ? singular : plural;
  }

  function singularOnly(writer, value) {
    if ( value === 1 ) {
      return singular(writer, value);
    }
    return plural;
  }

  function pluralOnly(writer, value) {
    if ( value === 1 ) {
      return singular;
    }
    return plural(writer, value);
  }

  function both(writer, value) {
    var branch = value === 1 ? singular : plural;
    return branch(writer, value);
  }
}

// Exports
exports.counter = counter;
exports.evenOdd = evenOdd;
exports.separator = separator;
exports.pluralizer = pluralizer;

},{"../../types":15}],13:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var format = require('../../format');
var types = require('../../types');
var helpers = require('./helpers');

var buildDeferredFormatter = format.buildDeferredFormatter;
var stringify = types.stringify;
var wrap = helpers.wrap;

// `build(value, supportFunctions)` converts the provided string and
// supportFunctions Object into an Interpol interpolation function.
function build(writer, value, supportFunctions) {
  var formatter = buildDeferredFormatter(stringify(value));
  return formatter(supportFunctions);
}

// `lower(value)` converts the provided string to lower-case and returns
// the result.
function lower(writer, value) {
  return stringify(value).toLowerCase();
}

// `split(delim, value)` splits the provided string wherever the
// specified delimiter (or whitespace) is encountered and returns the
// result.
function split(writer, delim, value) {
  if ( value === undefined ) {
    value = delim;
    delim = /\s*/;
  }
  return stringify(value).split(delim);
}

// `title(value)` converts the provided string to title-case and returns
// the result.  Title case converts the first character of each word to
// upper-case, and the rest to lower-case.
function title(writer, value) {
  return stringify(value).replace(/\w\S*/g, function (word) {
    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
  });
}

// `upper(value)` converts the provided string to upper-case and returns
// the result.
function upper(writer, value) {
  return stringify(value).toUpperCase();
}

// `string(value)` converts value to a String
exports.string = wrap(String);

// Exported Functions
exports.build = build;
exports.lower = lower;
exports.split = split;
exports.title = title;
exports.upper = upper;

},{"../../format":3,"../../types":15,"./helpers":8}],14:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var format = require('./format');
var match = require('./match');

var types = require('./types');
var isInterpolRuntime = types.isInterpolRuntime;
var isInterpolFunction = types.isInterpolFunction;
var isInterpolPartial = types.isInterpolPartial;
var isInterpolGenerator = types.isInterpolGenerator;
var stopIteration = types.stopIteration;
var bless = types.bless;

var util = require('./util');
var isArray = util.isArray;
var mixin = util.mixin;
var extendObject = util.extendObject;
var objectKeys = util.objectKeys;

var internalResolvers = require('./resolvers/internal');
var createSystemResolver = internalResolvers.createSystemResolver;
var createMemoryResolver = internalResolvers.createMemoryResolver;

var writers = require('./writers');
var createStringWriter = writers.createStringWriter;
var nullWriter = writers.createNullWriter();

var noOp = bless(function () {});

var slice = Array.prototype.slice;

function createRuntime(interpol, runtimeOptions) {
  if ( isInterpolRuntime(runtimeOptions) ) {
    return runtimeOptions;
  }

  var options = mixin({}, runtimeOptions);
  var cacheModules = options.cache;
  var createDefaultResolvers = !options.resolvers;
  var resolvers = createDefaultResolvers ? [] : options.resolvers;

  var resolveExports = createResolver('resolveExports');
  var resolveModule = createResolver('resolveModule');

  var runtime = {
    __intRuntime: true,
    interpol: interpol,

    options: getOptions,
    resolvers: getResolvers,

    extendObject: util.extendObject,
    mixin: util.mixin,
    isArray: util.isArray,

    isTruthy: types.isTruthy,
    isFalsy: types.isFalsy,
    isIn: types.isIn,

    immediateFormatter: format.buildImmediateFormatter,
    deferredFormatter: format.buildDeferredFormatter,

    matches: match.matches,
    matcher: match.matcher,

    resolveExports: resolveExports,
    resolveModule: resolveModule,
    importer: buildImporter,
    defineModule: defineModule,
    definePartial: definePartial,
    defineGuardedPartial: defineGuardedPartial,

    getProperty: getProperty,
    getPath: getPath,
    bindPartial: bindPartial,
    
    loop: loop,
    exec: exec
  };

  if ( createDefaultResolvers ) {
    createSystemResolver(runtime);
    createMemoryResolver(runtime, true);
  }

  return runtime;

  function getOptions() {
    return options;
  }

  function getResolvers() {
    return resolvers;
  }

  function createResolver(methodName) {
    return resolve;

    function resolve(moduleName) {
      for ( var i = resolvers.length - 1; i >= 0; i-- ) {
        var module = resolvers[i][methodName](moduleName);
        if ( module ) {
          return module;
        }
      }
      return undefined;
    }
  }

  // where exports are actually resolved. raiseError will be false
  // if we're in the process of evaluating a template for the purpose
  // of yielding its exports
  function buildImporter(moduleName) {
    var importer = dynamicImporter;
    var module;

    return performImport;

    function performImport() {
      return importer();
    }

    function cachedImporter() {
      return module;
    }

    function dynamicImporter() {
      module = resolveExports(moduleName);
      if ( !module ) {
        throw new Error("Module '" + moduleName + "' not resolved");
      }
      if ( cacheModules ) {
        importer = cachedImporter;
      }
      return module;
    }
  }
}

function createToString(func) {
  var stringWriters = [];
  var stringWritersAvail = 0;
  return toString;

  function toString() {
    var writer;
    if ( stringWritersAvail ) {
      writer = stringWriters[--stringWritersAvail];
    }
    else {
      writer = createStringWriter();
    }
    try {
      func(writer);
      var result = writer.done();
      stringWriters[stringWritersAvail++] = writer;
      return result;
    }
    catch ( err ) {
      writer.reset();
      stringWriters[stringWritersAvail++] = writer;
      throw err;
    }
  }
}

function defineModule(template) {
  var stringWriters = [];
  var stringWritersAvail = 0;
  var defaultOptions = {};
  var exportedContext;

  templateInterface.__intModule = true;
  templateInterface.exports = templateExports;
  return templateInterface;

  function templateInterface(obj, templateOptions) {
    var ctx = obj ? extendObject(obj) : {};
    if ( !templateOptions ) {
      templateOptions = defaultOptions;
    }

    // If no Writer is provided, create a throw-away Array Writer
    var writer = templateOptions.writer;
    var useStringWriter = !writer;

    try {
      if ( useStringWriter ) {
        if ( stringWritersAvail ) {
          writer = stringWriters[--stringWritersAvail];
        }
        else {
          writer = createStringWriter();
        }
        template(ctx, writer);
        var result = writer.done();
        stringWriters[stringWritersAvail++] = writer;
        return result;
      }
      template(ctx, writer);
      return writer.done();
    }
    catch ( err ) {
      writer.reset();
      if ( useStringWriter ) {
        stringWriters[stringWritersAvail++] = writer;
      }
      if ( typeof templateOptions.errorCallback === 'function' ) {
        templateOptions.errorCallback(err);
        return;
      }
      // Re-raise if no callback
      throw err;
    }
  }

  /**
   * Returns the symbols (partials and assignments) that the runtime
   * template will product against an empty `{}` context Object.  This is
   * the method by which Interpol imports work.  Partials produced with
   * this method still have access to the global context.
   */
  function templateExports() {
    /* istanbul ignore if: guard */
    if ( exportedContext ) {
      return exportedContext;
    }

    // `__intExports` is an indicator to evaluators that we're processing
    // exports and so they can be a bit lax about reporting errors or
    // resolving imports

    exportedContext = {};
    exportedContext.__intExports = true;
    template(exportedContext, nullWriter);
    delete exportedContext.__intExports;

    return exportedContext;
  }
}

function definePartial(partial) {
  partial.__intFunction = 'part';
  partial.toString = createToString(partial);
  return partial;
}

function defineGuardedPartial(originalPartial, envelope) {
  if ( !isInterpolPartial(originalPartial) ) {
    originalPartial = noOp;
  }
  return definePartial(envelope(originalPartial));
}

function getProperty(obj, property) {
  if ( obj === undefined || obj === null ) {
    return undefined;
  }
  var res = obj[property];
  return res === null ? undefined : res;
}

function getPath(obj) {
  for ( var i = 1, len = arguments.length; i < len; i++ ) {
    if ( obj === undefined || obj === null ) {
      return undefined;
    }
    obj = obj[arguments[i]];
  }
  return obj === null ? undefined : obj;
}

function bindPartial(ctx, func, callArgs) {
  /* istanbul ignore if: short-circuit */
  if ( !isInterpolFunction(func) ) {
    if ( ctx.__intExports ) {
      return undefined;
    }
    throw new Error("Attempting to bind an unblessed function");
  }

  var argTemplate = [undefined].concat(callArgs);
  boundPartial.__intFunction = func.__intFunction;
  boundPartial.toString = createToString(boundPartial);
  return boundPartial;

  function boundPartial(writer) {
    /* jshint validthis:true */
    var applyArgs = argTemplate.slice(0).concat(slice.call(arguments, 1));
    applyArgs[0] = writer;
    return func.apply(this, applyArgs);
  }
}

function loop(data, loopCallback) {
  var i, len, name, value;

  if ( isArray(data) ) {
    for ( i = 0, len = data.length; i < len; i++ ) {
      value = data[i];
      loopCallback(value === null ? undefined : value);
    }
    return;
  }
  
  if ( typeof data === 'object' && data !== null ) {
    var items = objectKeys(data);
    for ( i = 0, len = items.length; i < len; i++ ) {
      name = items[i];
      value = data[name];
      loopCallback({
        name: name,
        value: value === null ? undefined : value
      });
    }
    return;
  }
  
  if ( isInterpolGenerator(data) ) {
    for ( value = data(); value !== stopIteration; value = data() ) {
      loopCallback(value);
    }
  }
}

function exec(ctx, func, args) {
  /* istanbul ignore if: short-circuit */
  if ( !isInterpolFunction(func) ) {
    if ( ctx.__intExports ) {
      return undefined;
    }
    throw new Error("Attempting to call an unblessed function");
  }
  return func.apply(null, args);
}

// Exported Functions
exports.createRuntime = createRuntime;

},{"./format":3,"./match":5,"./resolvers/internal":6,"./types":15,"./util":16,"./writers":17}],15:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');

var isArray = util.isArray;
var objectKeys = util.objectKeys;

function emptyString() {
  return '';
}

var stopIteration = {
  __intStopIteration: true
};

/**
 * Returns whether or not an Object is an Interpol Runtime instance.
 *
 * @param {Object} obj the Object to check
 */
function isInterpolRuntime(obj) {
  return typeof obj === 'object' && obj !== null && obj.__intRuntime;
}

/**
 * Returns whether or not an Object is an Interpol Node Module.
 *
 * @param {Object} obj the Object to check
 */
function isInterpolNodeModule(obj) {
  return typeof obj === 'object' && obj !== null && obj.__intNodeModule;
}

/**
 * Returns whether or not a Function is a compiled Interpol Module.
 *
 * @param {Function} func the Function to check
 */
function isInterpolModule(func) {
  return typeof func === 'function' && func.__intModule;
}

/**
 * Returns whether or not a Function is 'blessed' as Interpol-compatible.
 *
 * @param {Function} func the Function to check
 */
function isInterpolFunction(func) {
  return typeof func === 'function' && func.__intFunction;
}

/**
 * Same as isInterpolFunction except that it's checking specifically for
 * a declared partial.
 *
 * @param {Function} func the Function to check
 */
function isInterpolPartial(func) {
  return typeof func === 'function' && func.__intFunction === 'part';
}

/**
 * Same as isInterpolFunction except that it's checking specifically for
 * a generator.
 *
 * @param {Function} func the Function to check
 */
function isInterpolGenerator(func) {
  return typeof func === 'function' && func.__intFunction === 'gen';
}

/**
 * 'bless' a Function or String as being Interpol-compatible.  In the case of
 * a String, it will mark the String as capable of being rendered without 
 * escaping.  With the exception of generators, all Functions in Interpol
 * will be passed a Writer instance as the first argument. 
 *
 * @param {Function|String} value the String or Function to 'bless'
 * @param {String} [funcType] the blessed type ('wrap' or 'string' by default) 
 */
function bless(value, funcType) {
  var type = typeof value;

  switch ( type ) {
    case 'string':
      var blessString = function () { return value; };
      blessString.toString = blessString;
      blessString.__intFunction = 'string';
      return blessString;

    case 'function':
      if ( value.__intFunction ) {
        return value;
      }
      value.__intFunction = funcType || 'wrap';
      value.toString = emptyString;
      return value;

    default:
      throw new Error("Argument to bless must be a Function or String");
  }
}

function stringifyArray(value, stringifier) {
  var result = [];
  for ( var i = 0, len = value.length; i < len; i++ ) {
    result[i] = stringifier(value[i]);
  }
  return result.join(' ');
}

/**
 * Stringify the provided value for Interpol's purposes.
 *
 * @param {Mixed} value the value to stringify
 */
function stringify(value) {
  switch ( typeof value ) {
    case 'string':
      return value;

    case 'number':
      return '' + value;

    case 'boolean':
      return value ? 'true' : 'false';

    case 'function':
      return value.__intFunction ? value.toString() : '';

    case 'object':
      if ( isArray(value) ) {
        return stringifyArray(value, stringify);
      }
      return value === null ? '' : value.toString();

    default:
      return '';
  }
}

var ampRegex = /&/g;
var ltRegex = /</g;
var gtRegex = />/g;
var quoteRegex = /"/g;
var aposRegex = /'/g;

/**
 * Escape the provided value for the purposes of rendering it as an HTML
 * attribute.
 *
 * @param {Mixed} value the value to escape
 */
var escapeAttribute = createEscapedStringifier(/[&<>'"]/, replaceAttribute);

/**
 * Escape the provided value for the purposes of rendering it as HTML
 * content.
 *
 * @param {Mixed} value the value to escape
 */
var escapeContent = createEscapedStringifier(/[&<>]/, replaceContent);

function replaceAttribute(value) {
  return value.replace(ampRegex, '&amp;')
              .replace(ltRegex, '&lt;')
              .replace(gtRegex, '&gt;')
              .replace(quoteRegex, '&quot;')
              .replace(aposRegex, '&#39;');
}

function replaceContent(value) {
  return value.replace(ampRegex, '&amp;')
              .replace(ltRegex, '&lt;')
              .replace(gtRegex, '&gt;');
}

function createEscapedStringifier(escapeRegex, replaceFunction) {
  return escapedStringifier;

  // This is very similar to 'stringify' with the exception of 'string'
  function escapedStringifier(value) {
    switch ( typeof value ) {
      case 'string':
        return escapeRegex.test(value) ? replaceFunction(value) : value;

      case 'number':
        return '' + value;

      case 'boolean':
        return value ? 'true' : 'false';

      case 'function':
        return value.__intFunction ? value.toString() : '';

      case 'object':
        if ( isArray(value) ) {
          return stringifyArray(value, escapedStringifier);
        }
        return value === null ? '' : value.toString();
        
      default:
        return '';
    }
  }
}

/**
 * Checks whether or not the provided value is *truthy* by Interpol's
 * standards.
 *
 * @param {Mixed} value the value to test
 * @returns {boolean} if the value constitutes a *truthy* one
 */
function isTruthy(value) {
  if ( !value ) {
    return false;
  }
  if ( isArray(value) ) {
    return value.length > 0;
  }
  if ( typeof value === 'object' && value !== null ) {
    return objectKeys(value).length > 0;
  }
  return true;
}

/**
 * Checks whether or not the provided value is *falsy* by Interpol's
 * standards.
 *
 * @param {Mixed} value the value to test
 * @returns {boolean} if the value constitutes a *falsy* one
 */
function isFalsy(value) {
  if ( !value ) {
    return true;
  }
  if ( isArray(value) ) {
    return value.length === 0;
  }
  if ( typeof value === 'object' && value !== null ) {
    return objectKeys(value).length === 0;
  }
  return false;
}

/**
 * Checks whether or not the provided value exists within the specified list.
 * 
 * @param {Mixed} value the value to check
 * @param {Mixed} list the list to scan
 * @returns {boolean} if the value is found in the list
 */
function isIn(value, list) {
  if ( isArray(list) ) {
    return list.indexOf(value) !== -1;
  }
  if ( typeof list === 'object' && list !== null ) {
    return list.hasOwnProperty(value);    
  }
  return false;
}

// Exported Functions
exports.stopIteration = stopIteration;
exports.isInterpolRuntime = isInterpolRuntime;
exports.isInterpolNodeModule = isInterpolNodeModule;
exports.isInterpolModule = isInterpolModule;
exports.isInterpolFunction = isInterpolFunction;
exports.isInterpolPartial = isInterpolPartial;
exports.isInterpolGenerator = isInterpolGenerator;
exports.stringify = stringify;
exports.escapeAttribute = escapeAttribute;
exports.escapeContent = escapeContent;
exports.bless = bless;
exports.isTruthy = isTruthy;
exports.isFalsy = isFalsy;
exports.isIn = isIn;

},{"./util":16}],16:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

// Interpol-specific utilities and polyfills.  These are implemented *as*
// Interpol uses them rather than being strictly ES5 compatible.

var toString = Object.prototype.toString;

var isArray = Array.isArray;
/* istanbul ignore if: won't happen in node */
if ( !isArray ) {
  isArray = function _isArray(obj) {
    return obj && toString.call(obj) === '[object Array]';
  };
}

var objectKeys = Object.keys;
/* istanbul ignore if: won't happen in node */
if ( !objectKeys ) {
  objectKeys = function _objectKeys(obj) {
    var keys = [];
    for ( var key in obj ) {
      if ( obj.hasOwnProperty(key) ) {
        keys.push(key);
      }
    }
    return keys;
  };
}

var extendObject;
var testProto = { __proto__: { works: true } };           // jshint ignore:line
/* istanbul ignore else: won't happen in node */
if ( testProto.works && objectKeys(testProto).length === 0 ) {
  extendObject = function _fastExtendObject(obj) {
    return { __proto__: obj };                            // jshint ignore:line
  };
}
else if ( Object.create ) {
  extendObject = Object.create;
}
else {
  extendObject = (function () {
    function FakeConstructor() {}
    return function _slowExtendObject(obj) {
      FakeConstructor.prototype = obj;
      return new FakeConstructor();
    };
  })();
}

function mixin(target) {
  for ( var i = 1, ilen = arguments.length; i < ilen; i++ ) {
    var src = arguments[i];
    if ( typeof src !== 'object' || src === null || isArray(src) ) {
      continue;
    }
    var keys = objectKeys(src);
    for ( var j = keys.length - 1; j >= 0; j-- ) {
      var key = keys[j];
      target[key] = src[key];
    }
  }
  return target;
}

var each;
/* istanbul ignore else: won't happen in node */
if ( Array.prototype.forEach ) {
  each = (function () {
    var inner = Array.prototype.forEach;
    return function _each(value, callback) {
      return inner.call(value, callback);
    };
  })();
}
else {
  each = function _each(arr, callback) {
    for ( var i = 0, len = arr.length; i < len; i++ ) {
      callback(arr[i], i);
    }
  };
}

var map;
/* istanbul ignore else: won't happen in node */
if ( Array.prototype.map ) {
  map = (function () {
    var inner = Array.prototype.map;
    return function _map(value, callback) {
      return inner.call(value, callback);
    };
  })();
}
else {
  map = function _map(arr, callback) {
    var result = [];
    each(arr, function (item, i) {
      result[i] = callback(item);
    });
    return result;
  };
}

var filter;
/* istanbul ignore else: won't happen in node */
if ( Array.prototype.filter ) {
  filter = (function () {
    var inner = Array.prototype.filter;
    return function _filter(value, callback) {
      return inner.call(value, callback);
    };
  })();
}
else {
  filter = function _filter(arr, callback) {
    var result = [];
    each(arr, function (item) {
      if ( !callback(item) ) {
        result.push(item);
      }
    });
    return result;
  };
}

function selfMap(arr, callback) {
  each(arr, function (item, i) {
    arr[i] = callback(item);
  });
  return arr;
}

// Exported Functions
exports.isArray = isArray;
exports.extendObject = extendObject;
exports.objectKeys = objectKeys;
exports.mixin = mixin;

exports.each = each;
exports.map = map;
exports.filter = filter;
exports.selfMap = selfMap;

},{}],17:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var nullWriter = require('./null');
var stringWriter = require('./string');

// Exported Functions
exports.createNullWriter = nullWriter.createNullWriter;
exports.createStringWriter = stringWriter.createStringWriter;

},{"./null":18,"./string":19}],18:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');

function noOp() {}

/**
 * Creates a NullWriter.  All calls to this writer find their way into the
 * bit bucket.  Its primary purpose is to support the background rendering of
 * modules in order to yield their exported symbols.
 */
function createNullWriter() {
  return {
    done: noOp,
    reset: noOp,
    startElement: noOp,
    selfCloseElement: noOp,
    endElement: noOp,
    comment: noOp,
    docType: noOp,
    content: noOp,
    raw: noOp
  };
}

// Exported Functions
exports.createNullWriter = createNullWriter;

},{"../util":16}],19:[function(require,module,exports){
/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../types');
var util = require('../util');

var stringify = types.stringify;
var escapeAttribute = types.escapeAttribute;
var escapeContent = types.escapeContent;

/**
 * Creates a StringWriter.  Interpol will create one by default if it is not
 * provided as an option to a compiled template.  A StringWriter manages the
 * writing of content as an underlying Array of Strings.  This Array is joined
 * and returned when the `done()` function is called.
 */
function createStringWriter() {
  var buffer = '';

  return {
    done: done,
    reset: reset,
    startElement: startElement,
    selfCloseElement: selfCloseElement,
    endElement: endElement,
    comment: comment,
    docType: docType,
    content: content,
    raw: raw
  };

  function done() {
    var result = buffer;
    buffer = '';
    return result;
  }

  function reset() {
    buffer = '';
  }

  function writeAttributes(attributes) {
    for ( var key in attributes ) {
      var val = attributes[key];
      if ( typeof val !== 'boolean' ) {
        buffer += " " + stringify(key) + "=\"" + escapeAttribute(val) + "\"";
        continue;
      }
      if ( val ) {
        buffer += " " + stringify(key);
      }
    }
  }

  function startElement(tagName, attributes) {
    buffer += "<" + stringify(tagName);
    writeAttributes(attributes);
    buffer += ">";
  }

  function selfCloseElement(tagName, attributes) {
    buffer += "<" + stringify(tagName);
    writeAttributes(attributes);
    buffer += " />";
  }

  function endElement(tagName) {
    buffer += "</" + stringify(tagName) + ">";
  }

  function comment(content) {
    buffer += "<!--" + content + "-->";
  }

  function docType(rootElement) {
    buffer += "<!DOCTYPE " + stringify(rootElement) + ">";
  }

  function content(value) {
    buffer += escapeContent(value);
  }

  function raw(value) {
    buffer += value;
  }
}

// Exported Functions
exports.createStringWriter = createStringWriter;

},{"../types":15,"../util":16}]},{},[1]);

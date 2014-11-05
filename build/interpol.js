(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

// This module is used to collect the requirements for a minimal
// Browserify build.  It's of no interest to Node.js

// Set the Interpol browser global
var interpol = window.interpol = require('../lib/interpol');

// Resolvers
require('../lib/resolvers/memory').registerResolver(interpol);
require('../lib/resolvers/system').registerResolver(interpol);

// Writers
require('../lib/writers/null').registerWriter(interpol);
require('../lib/writers/string').registerWriter(interpol);
require('../lib/writers/dom').registerWriter(interpol);

},{"../lib/interpol":4,"../lib/resolvers/memory":6,"../lib/resolvers/system":7,"../lib/writers/dom":15,"../lib/writers/null":16,"../lib/writers/string":17}],2:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

/**
 * This is a stub that will be populated by the 'real' compiler functionality
 * should it be loaded by either Node.js or Browserify.  It's here because
 * we shouldn't have to rely on Browserify's `--ignore` option.
 */

},{}],3:[function(require,module,exports){
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

var objectKeys = util.objectKeys;
var each = util.each;
var stringify = types.stringify;
var isInterpolFunction = types.isInterpolFunction;

var nullWriter;

var Digits = "[1-9][0-9]*";
var Ident = "[$_a-zA-Z][$_a-zA-Z0-9]*";
var Params = "%((%)|(" + Digits + ")|(" + Ident + "))?(([|]" + Ident + ")*)?";
             /* "%" ( "%" | digits | identifier )? ( "|" identifier )* */

var ParamRegex = new RegExp(Params, "m");

var TemplateCacheMax = 256;

/**
 * Builds a closure that will be used internally to support Interpol's
 * interpolation operations.  The returned closure will attach flags
 * that identify any names or indexes that must be provided by interpol
 * to fulfill its formatting.
 *
 * @param {String} formatStr the String to be used for interpolation
 */
function buildFormatter(formatStr) {
  var funcs = [];
  var requiredIndexes = {};
  var requiredFunctions = {};
  var flen = 0;
  var autoIdx = 0;

  while ( formatStr && formatStr.length ) {
    var paramMatch = ParamRegex.exec(formatStr);
    if ( !paramMatch ) {
      funcs.push(createLiteralFunction(formatStr));
      break;
    }

    var match = paramMatch[0];
    var matchIdx = paramMatch.index;
    var matchLen = match.length;

    if ( matchIdx ) {
      funcs.push(createLiteralFunction(formatStr.substring(0, matchIdx)));
    }

    if ( paramMatch[2] === '%' ) {
      funcs.push(createLiteralFunction('%'));
      formatStr = formatStr.substring(matchIdx + matchLen);
      continue;
    }

    var idx = autoIdx++;
    if ( paramMatch[4] ) {
      idx = paramMatch[4];
    }
    else if ( paramMatch[3] ) {
      idx = parseInt(paramMatch[3], 10) - 1;
    }
    requiredIndexes[idx] = true;

    if ( paramMatch[5] ) {
      var formatters = paramMatch[5].slice(1).split('|');
      funcs.push(createPipedFunction(idx, formatters));
    }
    else {
      funcs.push(createIndexedFunction(idx));
    }

    formatStr = formatStr.substring(matchIdx + matchLen);
  }
  flen = funcs.length;

  templateFunction.__intRequiredIndexes = objectKeys(requiredIndexes);
  templateFunction.__intRequiredFunctions = objectKeys(requiredFunctions);
  return templateFunction;

  function templateFunction(data, supportFunctions) {
    if ( typeof data !== 'object' || data === null ) {
      data = [data];
    }

    var output = [];
    for ( var i = 0; i < flen; i++ ) {
      output[i] = funcs[i](data, supportFunctions);
    }

    return output.join('');
  }

  function createLiteralFunction(literal) {
    return literalFunction;

    function literalFunction() {
      return literal;
    }
  }

  function createIndexedFunction(idx) {
    return indexedFunction;

    function indexedFunction(data, supportFunctions) {
      return stringify(data[idx]);
    }
  }

  function createPipedFunction(idx, formatters) {
    var funcs = formatters.reverse();
    var flen = funcs.length - 1;

    // Register requirement on these formatters
    each(funcs, function (funcName) {
      requiredFunctions[funcName] = true;
    });

    if ( !nullWriter ) {
      var createNullWriter = require('./writers/null').createNullWriter;
      nullWriter = createNullWriter();
    }

    return pipedFunction;

    function pipedFunction(data, supportFunctions) {
      var value = data[idx];
      for ( var i = flen; i >= 0; i-- ) {
        var funcName = funcs[i];
        var func = data[funcName];

        if ( func === undefined && supportFunctions ) {
          // Only fall back to supportFunctions if func is not in data at all
          func = supportFunctions[funcName];
        }

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

function createFormatterCache() {
  var cache = {};
  var cacheCount = 0;

  return dynamicFormatter;

  function dynamicFormatter(formatStr, data, supportFunctions) {
    // If we exhaust TemplateCacheMax, then something is clearly wrong here
    // and we're not using the evaluator for localized strings.  If we keep
    // caching, we're going to start leaking memory.  So this evaluator will
    // blow away the cache and start over
    var dynamicTemplate = cache[formatStr];

    if ( !dynamicTemplate ) {
      if ( cacheCount >= TemplateCacheMax ) {
        cache = {};
        cacheCount = 0;
      }
      // build and cache the dynamic template
      dynamicTemplate = buildFormatter(formatStr);
      cache[formatStr] = dynamicTemplate;
      cacheCount++;
    }

    return dynamicTemplate(data, supportFunctions);
  }
}

// Exported Functions
exports.buildFormatter = buildFormatter;
exports.createFormatterCache = createFormatterCache;

},{"./types":13,"./util":14,"./writers/null":16}],4:[function(require,module,exports){
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

var CURRENT_VERSION = "0.9.0";

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
 * a JSON instance.  The compiler module has to be loaded for this to work.
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

},{"./compiler/stub":2,"./runtime":12,"./types":13,"./util":14}],5:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
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
    if ( !isArray(obj) || template.length !== obj.length ) {
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
    if ( !isArray(obj) || mlen !== obj.length ) {
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
exports.isMatchingObject = isMatchingObject;
exports.buildMatcher = buildMatcher;

},{"./util":14}],6:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');
var types = require('../types');

var slice = Array.prototype.slice;
var isArray = util.isArray;
var bless = types.bless;
var isInterpolModule = types.isInterpolModule;

/**
 * Creates a new MemoryResolver.  As its name implies, this resolver
 * allows one to register a module to be stored in memory.  A default
 * instance of this resolver is used to store the System Modules.
 * Because of its flexibility, it can also be used to store custom
 * modules and native JavaScript helpers.
 *
 * @param {function} interpol the Interpol Instance to use for compilation
 * @param {Object} [options] Options for generating the MemoryResolver
 */
function createMemoryResolver(interpol, options) {
  var cache = {};

  return {
    resolveModule: resolveModule,
    resolveExports: resolveExports,
    unregisterModule: unregisterModule,
    registerModule: registerModule
  };

  function resolveModule(name, runtime) {
    var result = cache[name];
    return result ? result.module : undefined;
  }

  function resolveExports(name, runtime) {
    var result = cache[name];
    if ( !result ) {
      return null;
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
    delete cache[normalizeModuleName(name)];
  }

  /**
   * Registers a module in the module cache.
   *
   * @param {String} name the name of the module to be registered
   * @param {Function|String|Object} module the module to register
   */
  function registerModule(name, module) {
    name = normalizeModuleName(name);

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
      cache[name] = { moduleExports: blessModule(module) };
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

function normalizeModuleName(name) {
  return name.replace(/[/\\.]+/g, '/');
}

function registerResolver(interpol) {
  var defaultMemoryResolver = createMemoryResolver(interpol);
  interpol.resolvers().push(defaultMemoryResolver);
  interpol.registerModule = defaultMemoryResolver.registerModule;
  interpol.unregisterModule = defaultMemoryResolver.unregisterModule;
  interpol.createMemoryResolver = createMemoryResolver;
  interpol.defaultMemoryResolver = defaultMemoryResolver;
}

// Exported Functions
exports.createMemoryResolver = createMemoryResolver;
exports.registerResolver = registerResolver;

},{"../types":13,"../util":14}],7:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var math = require('./math');
var list = require('./list');
var string = require('./string');

function registerResolver(interpol) {
  var defaultMemoryResolver = interpol.defaultMemoryResolver;
  defaultMemoryResolver.registerModule('math', math);
  defaultMemoryResolver.registerModule('list', list);
  defaultMemoryResolver.registerModule('string', string);
}

// Exported Functions
exports.registerResolver = registerResolver;

},{"./list":8,"./math":9,"./string":10}],8:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../../util');
var objectKeys = util.objectKeys;
var isArray = util.isArray;

// `first(value)` returns the first item of the provided array (or `null` if
// the array is empty).
function first(writer, value) {
  if ( !isArray(value) ) {
    return value;
  }
  return value[0];
}

// `join(value, delim)` returns the result of joining the elements of the
// provided array. Each element will be concatenated into a string separated
// by the specified delimiter (or ' ').
function join(writer, value, delim) {
  if ( isArray(value) ) {
    return value.join(delim || ' ');
  }
  return value;
}

// `last(value)` returns the last item of the provided array (or `null` if
// the array is empty).
function last(writer, value) {
  if ( !isArray(value) ) {
    return value;
  }
  if ( value.length ) {
    return value[value.length - 1];
  }
  return null;
}

// `length(value)` if it is an array, returns the length of the provided
// value (otherwise `0`).
function length(writer, value) {
  return isArray(value) ? value.length : 0;
}

// `empty(value)` returns true or false depending on whether or not the
// provided array is empty.
function empty(writer, value) {
  if ( isArray(value) ) {
    return !value.length;
  }
  return true;
}

// `keys(value)` returns the keys of the Object or indexes of the Array
// passed to it.  If the Array is sparse (has gaps) it will only return
// the indexes with assigned values.
function keys(writer, value) {
  if ( typeof value === 'object' && value !== null ) {
    return objectKeys(value);
  }
  return null;
}

// values(value)` returns the values of the Object or Array passed to
// it.  If the array is sparse (has gaps) it will only return the
// assigned values.
function values(writer, value) {
  if ( typeof value !== 'object' || value === null ) {
    return null;
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

},{"../../util":14}],9:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../../util');
var isArray = util.isArray;

var wrap = require('./wrap');

function numberSort(left, right) {
  return left > right;
}

// `avg(value)` if an Array, returns the average (mathematical mean) of
// value's elements
function avg(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  if ( value.length === 0 ) return 0;
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
  if ( value.length === 0 ) return 0;
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
exports.avg = avg;
exports.max = max;
exports.median = median;
exports.min = min;
exports.sum = sum;

},{"../../util":14,"./wrap":11}],10:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../../types');
var stringify = types.stringify;

var wrap = require('./wrap');

// `lower(value)` converts the provided string to lower-case and returns
// the result.
function lower(writer, value) {
  return stringify(value).toLowerCase();
}

// `split(value, delim, idx)` splits the provided string wherever the
// specified delimiter (or whitespace) is encountered and returns the
// result.
function split(writer, value, delim, idx) {
  var val = stringify(value).split(delim || /\s*/);
  return idx !== undefined ? val[idx] : val;
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
exports.lower = lower;
exports.split = split;
exports.title = title;
exports.upper = upper;

},{"../../types":13,"./wrap":11}],11:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../../types');
var bless = types.bless;

var slice = Array.prototype.slice;

function wrap(func) {
  return bless(wrappedFunction);

  function wrappedFunction(writer) {
    /* jshint validthis:true */
    return func.apply(this, slice.call(arguments, 1));
  }
}

// Exported Functions
module.exports = wrap;

},{"../../types":13}],12:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');
var format = require('./format');
var match = require('./match');
var types = require('./types');

var createStringWriter = require('./writers/string').createStringWriter;
var nullWriter = require('./writers/null').createNullWriter();

var isInterpolRuntime = types.isInterpolRuntime;
var isInterpolPartial = types.isInterpolPartial;
var isInterpolFunction = types.isInterpolFunction;
var isNil = types.isNil;
var handleNil = types.handleNil;

var isArray = util.isArray;
var mixin = util.mixin;
var each = util.each;
var extendObject = util.extendObject;
var objectKeys = util.objectKeys;
var configure = util.configure;

var slice = Array.prototype.slice;

var globalOptions = { writer: null, errorCallback: null };
var globalContext = {};
var globalResolvers = [];

function noOp() {}
noOp.__intFunction = 'part';

function createRuntime(localOptions) {
  if ( isInterpolRuntime(localOptions) ) {
    return localOptions;
  }

  var options = mixin({}, globalOptions, localOptions);
  var resolvers = options.resolvers || globalResolvers;
  var cacheModules = options.cache;

  var runtime = {
    __intRuntime: true,

    options: options,
    resolvers: resolvers,

    extendObject: util.extendObject,
    mixin: util.mixin,
    isTruthy: types.isTruthy,
    isFalsy: types.isFalsy,

    buildFormatter: format.buildFormatter,
    createFormatterCache: format.createFormatterCache,
    isMatchingObject: match.isMatchingObject,
    buildMatcher: match.buildMatcher,

    buildImporter: buildImporter,
    defineModule: defineModule,
    definePartial: definePartial,
    defineGuardedPartial: defineGuardedPartial,
    cleanseArguments: cleanseArguments,

    getProperty: getProperty,
    loop: loop,
    exec: exec,
    bind: bind
  };

  return runtime;

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
      for ( var i = resolvers.length - 1; i >= 0; i-- ) {
        module = resolvers[i].resolveExports(moduleName, runtime, options);
        if ( module ) {
          break;
        }
      }
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

function options() {
  return globalOptions;
}

function context() {
  return globalContext;
}

function resolvers() {
  return globalResolvers;
}

function defineModule(template) {
  var exportedContext;
  templateInterface.__intModule = true;
  templateInterface.configure = configureTemplate;
  templateInterface.exports = templateExports;
  return templateInterface;

  function templateInterface(obj, localOptions) {
    var ctx = mixin(extendObject(globalContext), obj);
    var processingOptions = mixin({}, globalOptions, localOptions);

    // If no Writer is provided, create a throw-away Array Writer
    var writer = processingOptions.writer || createStringWriter();

    try {
      writer.startRender();
      template(ctx, writer);
      return writer.endRender();
    }
    catch ( err ) {
      if ( typeof processingOptions.errorCallback === 'function' ) {
        processingOptions.errorCallback(err, null);
        return;
      }
      // Re-raise if no callback
      throw err;
    }
  }

  /**
   * Returns a preconfigured version of the runtime template with a
   * default obj and options.  Convenient if you're doing DOM writing
   * or need to repeatedly call the template with the same Object.
   *
   * @param {Object} defaultObj default context Object to use
   * @param {Object} defaultOptions default Options to provide
   */
  function configureTemplate(defaultObj, defaultOptions) {
    return configure(template, 0, slice.call(arguments, 0));
  }

  /**
   * Returns the symbols (partials and assignments) that the runtime
   * template will product against an empty `{}` context Object.  This is
   * the method by which Interpol imports work.  Partials produced with
   * this method still have access to the global context.
   */
  function templateExports() {
    /* istanbul ignore if */
    if ( exportedContext ) {
      return exportedContext;
    }

    // `__intExports` is an indicator to evaluators that we're processing
    // exports and so they can be a bit lax about reporting errors or
    // resolving imports

    exportedContext = extendObject(globalContext);
    exportedContext.__intExports = true;
    template(exportedContext, nullWriter);
    delete exportedContext.__intExports;

    return exportedContext;
  }
}

function definePartial(partial) {
  partial.__intFunction = 'part';
  return partial;
}

function defineGuardedPartial(originalPartial, envelope) {
  if ( !isInterpolPartial(originalPartial) ) {
    originalPartial = noOp;
  }
  return definePartial(envelope(originalPartial));
}

function cleanseArguments(arr, startIdx) {
  for ( var i = startIdx, len = arr.length; i < len; i++ ) {
    if ( arr[i] === null ) {
      arr[i] = undefined;
    }
  }
}

function getProperty(obj, property) {
  if ( obj )
  if ( isNil(obj) ) {
    return undefined;
  }
  return handleNil(obj[property]);
}

function loop(data, loopCallback) {
  if ( typeof data !== 'object' ) {
    return;
  }

  var items, createItem;
  if ( !isArray(data) ) {
    items = objectKeys(data);
    createItem = createObjectItem;
  }
  else {
    items = data;
    createItem = createArrayItem;
  }

  for ( var i = 0, len = items.length; i < len; i++ ) {
    loopCallback(createItem(i));
  }

  function createArrayItem(idx) {
    return handleNil(items[idx]);
  }

  function createObjectItem(idx) {
    var name = items[idx];
    return { name: name, value: handleNil(data[name]) };
  }
}

function exec(ctx, func, args) {
  if ( !isInterpolFunction(func) ) {
    if ( ctx.__intExports ) {
      return null;
    }
    throw new Error("Attempting to call an unblessed function");
  }
  return func.apply(null, args);
}

function bind(ctx, func, callArgs) {
  if ( !isInterpolFunction(func) ) {
    if ( ctx.__intExports ) {
      return null;
    }
    throw new Error("Attempting to bind an unblessed function");
  }

  var bound = configure(func, 1, callArgs);
  bound.__intFunction = func.__intFunction;
  return bound;
}

// Exported Functions
exports.createRuntime = createRuntime;
exports.options = options;
exports.context = context;
exports.resolvers = resolvers;

},{"./format":3,"./match":5,"./types":13,"./util":14,"./writers/null":16,"./writers/string":17}],13:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');

var isArray = util.isArray;

/**
 * Returns whether or not an Object is an Interpol Runtime instance.
 *
 * @param {Object} obj the Object to check
 */
function isInterpolRuntime(obj) {
  return typeof obj === 'object' && obj !== null && obj.__intRuntime;
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
 * 'bless' a Function as being Interpol-compatible.  This essentially means
 * that the Function must accept a Writer instance as the first argument, as
 * a writer will be passed to it by the compiled template.
 *
 * @param {Function} func the Function to 'bless'
 */
function bless(func) {
  if ( typeof func !== 'function' ) {
    throw new Error("Argument to bless must be a Function");
  }

  if ( func.__intFunction ) {
    return func;
  }

  blessedWrapper.__intFunction = 'wrap';
  return blessedWrapper;

  function blessedWrapper() {
    /* jshint validthis:true */
    return func.apply(this, arguments);
  }
}

var EscapeChars = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function escapeAttribute(str) {
  return str.replace(/[&<>'"]/gm, function(ch) {
    return EscapeChars[ch];
  });
}

function escapeContent(str) {
  return str.replace(/[&<>]/gm, function(ch) {
    return EscapeChars[ch];
  });
}

/**
 * Stringify the provided value for Interpol's purposes.
 *
 * @param {Mixed} value the value to stringify
 */
function stringify(value) {
  var type = typeof value;
  switch ( type ) {
    case 'string':
      return value;

    case 'number':
      return value.toString();

    case 'boolean':
      return value ? 'true' : 'false';

    case 'xml':
      return value.toXMLString();

    case 'object':
      if ( isArray(value) ) {
        var result = [];
        for ( var i = 0, len = value.length; i < len; i++ ) {
          result[i] = stringify(value[i]);
        }
        return result.join(' ');
      }
      return value !== null ? value.toString() : '';

    default:
      // catches 'undefined'
      return '';
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
  return true;
}

function isFalsy(value) {
  if ( !value ) {
    return true;
  }
  if ( isArray(value) ) {
    return value.length === 0;
  }
  return false;
}

function isNil(value) {
  return value === undefined || value === null;
}

function handleNil(value) {
  return value === null ? undefined : value;
}

// Exported Functions
exports.isInterpolRuntime = isInterpolRuntime;
exports.isInterpolModule = isInterpolModule;
exports.isInterpolFunction = isInterpolFunction;
exports.isInterpolPartial = isInterpolPartial;
exports.escapeAttribute = escapeAttribute;
exports.escapeContent = escapeContent;
exports.stringify = stringify;
exports.bless = bless;
exports.isTruthy = isTruthy;
exports.isFalsy = isFalsy;
exports.isNil = isNil;
exports.handleNil = handleNil;

},{"./util":14}],14:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var toString = Object.prototype.toString;
var slice = Array.prototype.slice;

var isArray = Array.isArray;
/* istanbul ignore if */
if ( !isArray ) {
  isArray = function _isArray(obj) {
    return obj && toString.call(obj) === '[object Array]';
  };
}

var objectKeys = Object.keys;
/* istanbul ignore if */
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

var extendObject = null;
(function () {
  function FakeConstructor() {}
  var testProto = { __proto__: { works: true } };

  /* istanbul ignore else */
  if ( testProto.works && objectKeys(testProto).length === 0 ) {
    extendObject = function _fastExtendObject(obj) {
      return { __proto__: obj };
    };
  }
  else if ( Object.create ) {
    extendObject = Object.create;
  }
  else {
    extendObject = function _slowExtendObject(obj) {
      FakeConstructor.prototype = obj;
      return new FakeConstructor();
    };
  }
})();

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

/**
 * Returns a 'configured' version of the provided function.  By configured,
 * this means that the wrapper can provide default values for any arguments
 * that aren't required.
 *
 * @param {Function} func the Function to configure
 * @param {Number} requiredCount the number of arguments that are required
 * @param {Array} defaultArgs default values for the rest of the arguments
 */
function configure(func, requiredCount, defaultArgs) {
  var argTemplate = new Array(requiredCount).concat(defaultArgs);
  return configuredWrapper;

  function configuredWrapper() {
    /* jshint validthis:true */
    var args = slice.call(arguments, 0);
    var applyArgs = args.concat(argTemplate.slice(args.length));
    return func.apply(this, applyArgs);
  }
}

var each;
if ( Array.prototype.forEach ) {
  each = (function () {
    var forEachMethod = Array.prototype.forEach;
    return function _each(arr, callback) {
      return forEachMethod.call(arr, callback);
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
if ( Array.prototype.map ) {
  map = (function () {
    var mapMethod = Array.prototype.map;
    return function _map(arr, callback) {
      return mapMethod.call(arr, callback);
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
if ( Array.prototype.filter ) {
  filter = (function () {
    var filterMethod = Array.prototype.filter;
    return function _filter(arr, callback) {
      return filterMethod.call(arr, callback);
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
exports.configure = configure;

exports.each = each;
exports.map = map;
exports.filter = filter;
exports.selfMap = selfMap;

},{}],15:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');
var string = require('./string');

var mixin = util.mixin;
var createStringWriter = string.createStringWriter;

var REPLACE = createDOMWriter.REPLACE = 'replace';
var APPEND = createDOMWriter.APPEND = 'append';
var INSERT = createDOMWriter.INSERT = 'insert';

/**
 * Creates a DOMWriter.  A DOMWriter attaches itself to a DOM Element,
 * and will manipulate that Element's content when a template is rendered
 * with it.  The writer is very simple and won't cover all use-cases, it
 * also may not be the most performant approach.
 *
 * The default mode is REPLACE, meaning all of the Element's children are
 * replaced when the associated template is rendered.  INSERT and APPEND
 * will insert new renderings to the beginning or end of the child list
 * respectively.
 *
 * @param {Element} parentElement the Element to which this DOMWriter attaches
 * @param {String} [renderMode] the DOM rendering mode: REPLACE|APPEND|INSERT
 */
function createDOMWriter(parentElement, renderMode) {
  var writer = createStringWriter();
  var writerEndRender = writer.endRender;
  var endRender;

  switch ( renderMode ) {
    case APPEND:  endRender = appendEndRender; break;
    case INSERT:  endRender = insertEndRender; break;
    // case REPLACE: endRender = replaceEndRender; break;
    default:      endRender = replaceEndRender;
  }

  return mixin({}, writer, {
    endRender: endRender
  });

  function appendEndRender() {
    var container = document.createElement("span");
    container.innerHTML = writerEndRender();
    parentElement.appendChild(container);
  }

  function insertEndRender() {
    var container = document.createElement("span");
    container.innerHTML = writerEndRender();
    parentElement.insertBefore(container, parentElement.firstChild);
  }

  function replaceEndRender() {
    parentElement.innerHTML = writerEndRender();
  }
}

function registerWriter(interpol) {
  interpol.createDOMWriter = createDOMWriter;
}

// Exported Functions
exports.createDOMWriter = createDOMWriter;
exports.registerWriter = registerWriter;

},{"../util":14,"./string":17}],16:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
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
    startRender: noOp,
    endRender: noOp,
    startElement: noOp,
    selfCloseElement: noOp,
    endElement: noOp,
    comment: noOp,
    docType: noOp,
    content: noOp,
    raw: noOp
  };
}

function registerWriter(interpol) {
  interpol.createNullWriter = createNullWriter;
}

// Exported Functions
exports.createNullWriter = createNullWriter;
exports.registerWriter = registerWriter;
},{"../util":14}],17:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../types');

var stringify = types.stringify;
var escapeAttribute = types.escapeAttribute;
var escapeContent = types.escapeContent;

function noOp() {}

/**
 * Creates a StringWriter.  Interpol will create one by default if it is not
 * provided as an option to a compiled template.  A StringWriter manages the
 * writing of content as an underlying Array of Strings.  This Array is joined
 * and returned when the `endRender()` function is called.
 */
function createStringWriter() {
  var arr = [];

  return {
    startRender: noOp,
    endRender: endRender,
    startElement: startElement,
    selfCloseElement: selfCloseElement,
    endElement: endElement,
    comment: comment,
    docType: docType,
    content: content,
    raw: arr.push.bind(arr)
  };

  function endRender() {
    var result = arr.join('');
    arr.length = 0;
    return result;
  }

  function writeAttributes(attributes) {
    for ( var key in attributes ) {
      var val = attributes[key];
      if ( typeof val !== 'boolean' ) {
        arr.push(" ", stringify(key), "=\"",
                 escapeAttribute(stringify(val)), "\"");
        continue;
      }
      if ( val ) {
        arr.push(" ", stringify(key));
      }
    }
  }

  function startElement(tagName, attributes) {
    arr.push("<", stringify(tagName));
    writeAttributes(attributes);
    arr.push(">");
  }

  function selfCloseElement(tagName, attributes) {
    arr.push("<", stringify(tagName));
    writeAttributes(attributes);
    arr.push(" />");
  }

  function endElement(tagName) {
    arr.push("</", stringify(tagName), ">");
  }

  function comment(content) {
    arr.push("<!--", content, "-->");
  }

  function docType(rootElement) {
    arr.push("<!DOCTYPE ", stringify(rootElement), ">");
  }

  function content(content) {
    arr.push(escapeContent(stringify(content)));
  }
}

function registerWriter(interpol) {
  interpol.createStringWriter = createStringWriter;
}

// Exported Functions
exports.createStringWriter = createStringWriter;
exports.registerWriter = registerWriter;
},{"../types":13}]},{},[1]);

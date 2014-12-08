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

// Register the Writers for easier access
var writers = require('../lib/writers');
interpol.createDOMWriter = writers.createDOMWriter;
interpol.createNullWriter = writers.createNullWriter;
interpol.createStringWriter = writers.createStringWriter;

},{"../lib/interpol":4,"../lib/writers":17}],2:[function(require,module,exports){
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
var bind = util.bind;
var stringify = types.stringify;
var isInterpolFunction = types.isInterpolFunction;

var Digits = "0|[1-9][0-9]*";
var Ident = "[$_a-zA-Z][$_a-zA-Z0-9]*";
var Pipes = "([|]" + Ident + ")*";
var Term = ";?";
var Params = "%((%)|(" + Digits + ")|(" + Ident + "))?(" + Pipes + ")?" + Term;
             /* "%" ( "%" | digits | identifier )? ( "|" identifier )* ";"? */

var ParamRegex = new RegExp(Params, "m");

var nullWriter = require('./writers/null').createNullWriter;

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

    var output = [];
    for ( var i = 0; i < clen; i++ ) {
      var component = components[i];
      switch ( component[0] ) {
        case 0: output[i] = component[1]; break;
        case 1: output[i] = stringify(data[component[1]]); break;
        case 2: output[i] = component[1](data, supportFunctions);
      }
    }
    return output.join('');
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
  if ( supportFunctions !== undefined ) {
    var bound = bind(formatter, supportFunctions);
    bound.__intFunction = 'format';
    bound.toString = formatter.toString;
    return bound;
  }
  return deferredFormatter;

  function deferredFormatter(supportFunctions) {
    var bound = bind(formatter, supportFunctions);
    bound.__intFunction = 'format';
    bound.toString = formatter.toString;
    return bound;
  }
}

function buildImmediateFormatter(formatStr, supportFunctions) {
  var formatter = buildFormatter(formatStr);
  if ( supportFunctions !== undefined ) {
    return bind(formatter, supportFunctions, undefined);
  }
  return immediateFormatter;

  function immediateFormatter(supportFunctions, data) {
    return formatter(supportFunctions, undefined, data);
  }
}

// Exported Functions
exports.buildFormatter = buildFormatter;
exports.buildDeferredFormatter = buildDeferredFormatter;
exports.buildImmediateFormatter = buildImmediateFormatter;

},{"./types":14,"./util":15,"./writers/null":18}],4:[function(require,module,exports){
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
var compileModule;
var generateFunction;

var CURRENT_VERSION = "1.2.1";

// Bootstrap

interpol.VERSION = CURRENT_VERSION;
interpol.bless = bless;
interpol.evaluate = evaluate;
interpol.compile = compile;
interpol.runtime = getRuntime;

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

},{"./compiler/stub":2,"./runtime":13,"./types":14,"./util":15}],5:[function(require,module,exports){
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
exports.matches = isMatchingObject;
exports.matcher = buildMatcher;

},{"./util":15}],6:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
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

},{"./memory":7,"./system":8}],7:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var types = require('../types');
var util = require('../util');

var isInterpolModule = types.isInterpolModule;
var bless = types.bless;
var isArray = util.isArray;

/**
 * Creates a new MemoryResolver.  As its name implies, this resolver
 * allows one to register a module to be stored in memory.  A default
 * instance of this resolver is used to store the System Modules.
 * Because of its flexibility, it can also be used to store custom
 * modules and native JavaScript helpers.
 *
 * @param {Runtime} [runtime] Runtime owner for MemoryResolver
 */
function createMemoryResolver(runtime) {
  var interpol = runtime.interpol;
  var cache = {};

  var resolver = {
    resolveModule: resolveModule,
    resolveExports: resolveExports,
    unregisterModule: unregisterModule,
    registerModule: registerModule
  };

  runtime.resolvers().push(resolver);
  runtime.registerModule = registerModule;
  runtime.unregisterModule = unregisterModule;
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

  function createModuleStub(moduleExports) {
    moduleExports = blessModule(moduleExports);
    templateInterface.__intModule = true;
    templateInterface.exports = templateExports;
    return templateInterface;

    function templateInterface() {
      // NO-OP
    }

    function templateExports() {
      return moduleExports;
    }
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

// Exported Functions
exports.createMemoryResolver = createMemoryResolver;
exports.blessModule = blessModule;

},{"../types":14,"../util":15}],8:[function(require,module,exports){
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

var blessModule = require('../memory').blessModule;

function createSystemResolver(runtime) {
  var system = {
    'math': blessModule(math),
    'list': blessModule(list),
    'string': blessModule(string)
  };

  var resolver = {
    resolveModule: resolveModule,
    resolveExports: resolveExports
  };

  runtime.resolvers().push(resolver);
  return resolver;

  function resolveModule() {
    return undefined;
  }

  function resolveExports(name) {
    return system[name];
  }
}

// Exported Functions
exports.createSystemResolver = createSystemResolver;

},{"../memory":7,"./list":9,"./math":10,"./string":11}],9:[function(require,module,exports){
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

// `last(value)` returns the last item of the provided array (or `null` if
// the array is empty).
function last(writer, value) {
  if ( !isArray(value) ) {
    return value;
  }
  if ( value.length ) {
    return value[value.length - 1];
  }
  return undefined;
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

},{"../../util":15}],10:[function(require,module,exports){
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
exports.avg = avg;
exports.max = max;
exports.median = median;
exports.min = min;
exports.sum = sum;

},{"../../util":15,"./wrap":12}],11:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var format = require('../../format');
var types = require('../../types');
var wrap = require('./wrap');

var buildDeferredFormatter = format.buildDeferredFormatter;
var stringify = types.stringify;

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

},{"../../format":3,"../../types":14,"./wrap":12}],12:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../../util');
var types = require('../../types');
var slice = util.slice;
var bless = types.bless;

function wrap(func) {
  return bless(wrappedFunction);

  function wrappedFunction(writer) {
    /* jshint validthis:true */
    return func.apply(this, slice(arguments, 1));
  }
}

// Exported Functions
module.exports = wrap;

},{"../../types":14,"../../util":15}],13:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
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
var isInterpolPartial = types.isInterpolPartial;
var isInterpolFunction = types.isInterpolFunction;
var bless = types.bless;

var util = require('./util');
var isArray = util.isArray;
var slice = util.slice;
var mixin = util.mixin;
var extendObject = util.extendObject;
var objectKeys = util.objectKeys;
var bind = util.bind;

var internalResolvers = require('./resolvers/internal');
var createSystemResolver = internalResolvers.createSystemResolver;
var createMemoryResolver = internalResolvers.createMemoryResolver;

var writers = require('./writers');
var createStringWriter = writers.createStringWriter;
var nullWriter = writers.createNullWriter();

var noOp = bless(function () {});
var defaultOptions = {};

function createRuntime(interpol, runtimeOptions) {
  if ( isInterpolRuntime(runtimeOptions) ) {
    return runtimeOptions;
  }

  var options = mixin({}, runtimeOptions);
  var cacheModules = options.cache;
  var createResolvers = !options.resolvers;
  var resolvers = createResolvers ? [] : options.resolvers;

  var resolveExports = bind(resolve, 'resolveExports');
  var resolveModule = bind(resolve, 'resolveModule');

  var runtime = {
    __intRuntime: true,
    interpol: interpol,

    options: getOptions,
    resolvers: getResolvers,

    extendObject: util.extendObject,
    mixin: util.mixin,
    isTruthy: types.isTruthy,
    isFalsy: types.isFalsy,

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
    cleanseArguments: cleanseArguments,

    getProperty: getProperty,
    bindPartial: bindPartial,
    loop: loop,
    exec: exec
  };

  if ( createResolvers ) {
    createSystemResolver(runtime);
    createMemoryResolver(runtime);
  }

  return runtime;

  function getOptions() {
    return options;
  }

  function getResolvers() {
    return resolvers;
  }

  function resolve(methodName, moduleName) {
    for ( var i = resolvers.length - 1; i >= 0; i-- ) {
      var module = resolvers[i][methodName](moduleName);
      if ( module ) {
        return module;
      }
    }
    return undefined;
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
  return toString;

  function toString() {
    var writer = createStringWriter();
    func(writer);
    return writer.done();
  }
}

function defineModule(template) {
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
    var writer = templateOptions.writer || createStringWriter();

    try {
      template(ctx, writer);
      return writer.done();
    }
    catch ( err ) {
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

/* istanbul ignore next: sanity checker */
function cleanseArguments(arr, startIdx) {
  for ( var i = startIdx, len = arr.length; i < len; i++ ) {
    if ( arr[i] === null ) {
      arr[i] = undefined;
    }
  }
}

function getProperty(obj, property) {
  if ( obj === undefined || obj === null ) {
    return undefined;
  }
  var res = obj[property];
  return res === null ? undefined : res;
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
    var applyArgs = slice(argTemplate).concat(slice(arguments, 1));
    applyArgs[0] = writer;
    return func.apply(this, applyArgs);
  }
}

function loop(data, loopCallback) {
  var i, len, name, value;

  if ( data === null || typeof data !== 'object' ) {
    return;
  }

  if ( isArray(data) ) {
    for ( i = 0, len = data.length; i < len; i++ ) {
      value = data[i];
      loopCallback(value === null ? undefined : value);
    }
  }
  else {
    var items = objectKeys(data);
    for ( i = 0, len = items.length; i < len; i++ ) {
      name = items[i];
      value = data[name];
      loopCallback({
        name: name,
        value: value === null ? undefined : value
      });
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

},{"./format":3,"./match":5,"./resolvers/internal":6,"./types":14,"./util":15,"./writers":17}],14:[function(require,module,exports){
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
var bind = util.bind;

function emptyString() {
  return '';
}

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
 * 'bless' a Function or String as being Interpol-compatible.  For a Function
 * this essentially means that it must accept a Writer instance as the first
 * argument, as a writer will be passed to it by the compiled template.  For
 * a String, it will mark the String as capable of being rendered without
 * escaping.
 *
 * @param {Function|String} value the String or Function to 'bless'
 */
function bless(value) {
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
      var blessedFunc = bind(value);
      blessedFunc.__intFunction = 'wrap';
      blessedFunc.toString = emptyString;
      return blessedFunc;

    default:
      throw new Error("Argument to bless must be a Function or String");
  }
}

var EscapeChars = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Stringify the provided value for Interpol's purposes.
 *
 * @param {Mixed} value the value to stringify
 */
var stringify = bind(stringifyImpl, {}, null);

/**
 * Escape the provided value for the purposes of rendering it as an HTML
 * attribute.
 *
 * @param {Mixed} value the value to escape
 */
var escapeAttribute = bind(stringifyImpl, {}, (/[&<>'"]/gm));

/**
 * Escape the provided value for the purposes of rendering it as HTML
 * content.
 *
 * @param {Mixed} value the value to escape
 */
var escapeContent = bind(stringifyImpl, {}, (/[&<>]/gm));

var escapeCacheMax = 8192;
var escapeCacheSize = 0;

function stringifyImpl(escapeCache, escapeRegex, value) {
  var result;
  switch ( typeof value ) {
    case 'string':
      if ( !escapeRegex ) {
        return value;
      }

      result = escapeCache[value];
      if ( result ) {
        return result;
      }
      if ( escapeCacheSize >= escapeCacheMax ) {
        escapeCache = {};
        escapeCacheSize = 0;
      }
      else {
        escapeCacheSize += 1;
      }
      result = escapeCache[value] = value.replace(escapeRegex, function(ch) {
        return EscapeChars[ch];
      });
      return result;

    case 'number':
      return value.toString();

    case 'boolean':
      return value ? 'true' : 'false';

    case 'object':
      if ( isArray(value) ) {
        result = [];
        for ( var i = 0, len = value.length; i < len; i++ ) {
          result[i] = stringifyImpl(escapeCache, escapeRegex, value[i]);
        }
        return result.join(' ');
      }
      return value !== null ? value.toString() : '';

    case 'function':
      return value.__intFunction ? value.toString() : '';

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
  return false;
}

// Exported Functions
exports.isInterpolRuntime = isInterpolRuntime;
exports.isInterpolNodeModule = isInterpolNodeModule;
exports.isInterpolModule = isInterpolModule;
exports.isInterpolFunction = isInterpolFunction;
exports.isInterpolPartial = isInterpolPartial;
exports.escapeAttribute = escapeAttribute;
exports.escapeContent = escapeContent;
exports.stringify = stringify;
exports.bless = bless;
exports.isTruthy = isTruthy;
exports.isFalsy = isFalsy;

},{"./util":15}],15:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

// Interpol-specific utilities and polyfills.  These are implemented *as*
// Interpol uses them rather than being strictly ES5 compatible.  For example,
// `bind()` doesn't care about the `this` parameter.

var canBindCalls = !!Object.prototype.toString.call.bind;
var toString = Object.prototype.toString;

var slice;
/* istanbul ignore else: won't happen in node */
if ( canBindCalls ) {
  slice = Array.prototype.slice.call.bind(Array.prototype.slice);
}
else {
  slice = (function () {
    var inner = Array.prototype.slice;
    return function _slice(value, begin, end) {
      return inner.call(value, begin, end);
    };
  })();
}

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
/* istanbul ignore else: won't happen in node */
var testProto = { __proto__: { works: true } };           // jshint ignore:line
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

var bind;
/* istanbul ignore else: won't happen in node */
if ( Function.prototype.bind ) {
  bind = function _bind(func) {
    var args = [null].concat(slice(arguments, 1));
    return func.bind.apply(func, args);
  };
}
else {
  bind = function _bind(func) {
    var outerArgs = slice(arguments, 0);
    return _bound;

    function _bound() {
      return func.apply(null, outerArgs.concat(slice(arguments, 0)));
    }
  };
}

var each;
/* istanbul ignore else: won't happen in node */
if ( Array.prototype.forEach ) {
  /* istanbul ignore else: won't happen in node */
  if ( canBindCalls ) {
    each = Array.prototype.forEach.call.bind(Array.prototype.forEach);
  }
  else {
    each = (function () {
      var inner = Array.prototype.forEach;
      return function _each(value, callback) {
        return inner.call(value, callback);
      };
    })();
  }
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
  /* istanbul ignore else: won't happen in node */
  if ( canBindCalls ) {
    map = Array.prototype.map.call.bind(Array.prototype.map);
  }
  else {
    map = (function () {
      var inner = Array.prototype.map;
      return function _map(value, callback) {
        return inner.call(value, callback);
      };
    })();
  }
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
  /* istanbul ignore else: won't happen in node */
  if ( canBindCalls ) {
    filter = Array.prototype.filter.call.bind(Array.prototype.filter);
  }
  else {
    filter = (function () {
      var inner = Array.prototype.filter;
      return function _filter(value, callback) {
        return inner.call(value, callback);
      };
    })();
  }
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
exports.slice = slice;
exports.extendObject = extendObject;
exports.objectKeys = objectKeys;
exports.mixin = mixin;
exports.bind = bind;

exports.each = each;
exports.map = map;
exports.filter = filter;
exports.selfMap = selfMap;

},{}],16:[function(require,module,exports){
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
/* istanbul ignore next: browser-only */
function createDOMWriter(parentElement, renderMode) {
  var writer = createStringWriter();
  var writerDone = writer.done;

  if ( renderMode === undefined ) {
    renderMode = REPLACE;
  }

  switch ( renderMode ) {
    case APPEND:
      writer.done = appendEndRender;
      break;

    case INSERT:
      writer.done = insertEndRender;
      break;

    case REPLACE:
      writer.done = replaceEndRender;
      break;

    default:
      throw new Error("Invalid renderMode: " + renderMode);
  }

  function appendEndRender() {
    var container = document.createElement("span");
    container.innerHTML = writerDone();
    parentElement.appendChild(container);
  }

  function insertEndRender() {
    var container = document.createElement("span");
    container.innerHTML = writerDone();
    parentElement.insertBefore(container, parentElement.firstChild);
  }

  function replaceEndRender() {
    parentElement.innerHTML = writerDone();
  }
}

// Exported Functions
exports.createDOMWriter = createDOMWriter;

},{"../util":15,"./string":19}],17:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var domWriter = require('./dom');
var nullWriter = require('./null');
var stringWriter = require('./string');

// Exported Functions
exports.createDOMWriter = domWriter.createDOMWriter;
exports.createNullWriter = nullWriter.createNullWriter;
exports.createStringWriter = stringWriter.createStringWriter;

},{"./dom":16,"./null":18,"./string":19}],18:[function(require,module,exports){
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
    done: noOp,
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

},{"../util":15}],19:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
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

},{"../types":14,"../util":15}]},{},[1]);

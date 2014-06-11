(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
window.$interpol = require('../lib/interpol');

// Resolvers
require('../lib/resolvers/memory');
require('../lib/resolvers/system');

// Writers
require('../lib/writers/null');
require('../lib/writers/array');
require('../lib/writers/dom');

},{"../lib/interpol":3,"../lib/resolvers/memory":5,"../lib/resolvers/system":6,"../lib/writers/array":13,"../lib/writers/dom":14,"../lib/writers/null":15}],2:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util')
  , isInterpolFunction = util.isInterpolFunction
  , stringify = util.stringify;

var nullWriter;

var Digits = "[1-9][0-9]*"
  , Ident = "[$_a-zA-Z][$_a-zA-Z0-9]*"
  , Params = "%((%)|("+Digits+")|("+Ident+"))?(([|]"+Ident+")*)?";
             /* "%" ( "%" | digits | identifier )? ( "|" identifier )* */

var ParamRegex = new RegExp(Params, "m");

/**
 * Builds a closure that will be used internally to support Interpol's
 * interpolation operations.  The returned closure may attach a flag
 * `__requiresContext` that identifies it as requiring an Interpol
 * context to fulfill its formatting.  This usually occurs when the
 * pipe `|` operator is used.
 *
 * @param {String} formatStr the String to be used for interpolation
 */

function buildTemplate(formatStr) {
  var funcs = []
    , flen = 0
    , autoIdx = 0;

  while ( formatStr && formatStr.length ) {
    var paramMatch = ParamRegex.exec(formatStr);
    if ( !paramMatch ) {
      funcs.push(createLiteralFunction(formatStr));
      break;
    }

    var match = paramMatch[0]
      , matchIdx = paramMatch.index
      , matchLen = match.length;

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

    if ( paramMatch[5] ) {
      var formatters = paramMatch[5].slice(1).split('|');
      funcs.push(createPipedFunction(idx, formatters));
      templateFunction.__requiresContext = true;
    }
    else {
      funcs.push(createIndexedFunction(idx));
    }

    formatStr = formatStr.substring(matchIdx + matchLen);
  }
  flen = funcs.length;

  return templateFunction;

  function templateFunction(data, ctx) {
    if ( typeof data !== 'object' || data === null ) {
      data = [data];
    }

    var output = [];
    for ( var i = 0; i < flen; i++ ) {
      output[i] = funcs[i](data, ctx);
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

    function indexedFunction(data) {
      return stringify(data[idx]);
    }
  }

  function createPipedFunction(idx, formatters) {
    var funcs = formatters.reverse()
      , flen = funcs.length - 1;

    if ( !nullWriter ) {
      var createNullWriter = require('./writers/null').createNullWriter;
      nullWriter = createNullWriter();
    }

    return pipedFunction;

    function pipedFunction(data, ctx) {
      var value = data[idx];
      for ( var i = flen; i >= 0; i-- ) {
        var funcName = funcs[i]
          , func = data[funcName];

        if ( func === undefined && ctx ) {
          // Only fall back to context if func is not in data at all
          func = ctx[funcName];
        }

        if ( !isInterpolFunction(func) ) {
          if ( ctx.__intExports ) {
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

// Exported Functions
exports.buildTemplate = buildTemplate;

},{"./util":12,"./writers/null":15}],3:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util')
  , runtime = require('./runtime');

var isArray = util.isArray
  , bless = util.bless
  , isInterpolJSON = util.isInterpolJSON
  , buildRuntime = runtime.buildRuntime;

var CURRENT_VERSION = "0.4.0"
  , compileModule = null;

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

},{"./runtime":11,"./util":12}],4:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util')
  , isArray = util.isArray
  , objectKeys = util.objectKeys;

/** 
 * Basic Object Matcher to support the `like` operator.
 *
 * @param {Mixed} template the Template to match against
 * @param {Mixed} obj the Object being inspected
 */

function isMatchingObject(template, obj) {
  if ( template === obj ) {
    return true;
  }

  if ( template === null || template === undefined ) {
    return obj === null || obj === undefined;
  }

  if ( typeof template !== 'object' ) {
    return template === obj;
  }

  if ( isArray(template) ) {
    if ( !isArray(obj) || template.length !== obj.length ) { return false; }
    for ( var i = 0, len = template.length; i < len; i++ ) {
      if ( !isMatchingObject(template[i], obj[i]) ) {
        return false;
      }
    }
    return true;
  }

  if ( typeof obj !== 'object' || obj === null ) { return false; }

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
  var matchers = []
    , mlen = template.length;

  for ( var i = 0; i < mlen; i++ ) {
    matchers.push(buildMatcher(template[i]));
  }
  return arrayMatcher;

  function arrayMatcher(obj) {
    if ( template === obj ) { return true; }
    if ( !isArray(obj) || mlen !== obj.length ) { return false; }
    for ( var i = 0; i < mlen; i++ ) {
      if ( !matchers[i](obj[i]) ) {
        return false;
      }
    }
    return true;
  }
}

function buildObjectMatcher(template) {
  var matchers = []
    , keys = objectKeys(template)
    , mlen = keys.length;

  for ( var i = 0; i < mlen; i++ ) {
    matchers.push(buildMatcher(template[keys[i]]));
  }
  return objectMatcher;

  function objectMatcher(obj) {
    if ( template === obj ) { return true; }
    if ( typeof obj !== 'object' || obj === null ) { return false; }
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

},{"./util":12}],5:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util');

var slice = Array.prototype.slice
  , isArray = util.isArray
  , isInterpolJSON = util.isInterpolJSON
  , bless = util.bless;

/**
 * Creates a new Memory Resolver.  As its name implies, this resolver
 * allows one to register a module to be stored in memory.  A default 
 * instance of this resolver is used to store the System Modules.  
 * Because of its flexibility, it can also be used to store custom 
 * modules and native JavaScript helpers.
 */

function createMemoryResolver(options) {
  var cache = {};

  return {
    resolveModule: resolveModule,
    resolveExports: resolveExports,
    unregisterModule: unregisterModule,
    registerModule: registerModule
  };

  function resolveModule(name) {
    var result = cache[name];
    return result ? result.module : null;
  }

  function resolveExports(name) {
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

    // *Function* - A compiled Interpol closure
    if ( typeof module === 'function' &&
         typeof module.exports === 'function' ) {
      cache[name] = { module: module };
      return;
    }

    // *String* - An unparsed Interpol template **or** 
    // *Object* - A pre-compiled Interpol template
    if ( typeof module === 'string' || isInterpolJSON(module) ) {
      cache[name] = { module: interpol(module) };
      return;
    }

    // *Object* - A hash of Helpers (name->Function)
    if ( typeof module === 'object' && !isArray(module) ) {
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

// Add Default Memory Resolver
var defaultMemoryResolver = createMemoryResolver();
interpol.resolvers().push(defaultMemoryResolver);
interpol.registerModule = defaultMemoryResolver.registerModule;
interpol.unregisterModule = defaultMemoryResolver.unregisterModule;

// Exported Functions
exports.defaultMemoryResolver = defaultMemoryResolver;
exports.createMemoryResolver = createMemoryResolver;
interpol.createMemoryResolver = createMemoryResolver;

},{"../interpol":3,"../util":12}],6:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var memory = require('../memory')
  , defaultMemoryResolver = memory.defaultMemoryResolver;

defaultMemoryResolver.registerModule('math', require('./math'));
defaultMemoryResolver.registerModule('list', require('./list'));
defaultMemoryResolver.registerModule('string', require('./string'));

},{"../memory":5,"./list":7,"./math":8,"./string":9}],7:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../../util')
  , objectKeys = util.objectKeys
  , isArray = util.isArray;

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
  if ( value.length ) return value[value.length - 1];
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
  return !value || !value.length;
}

// `keys(value)` returns the keys of the Object or indexes of the Array
// passed to it.  If the Array is sparse (has gaps) it will only return
// the indexes with assigned values.
function keys(writer, value) {
  return typeof value === 'object' ? objectKeys(value) : null;
}

// values(value)` returns the values of the Object or Array passed to
// it.  If the array is sparse (has gaps) it will only return the
// assigned values.
function values(writer, value) {
  if ( typeof value !== 'object' ) {
    return null;
  }
  var keys = objectKeys(value)
    , result = [];
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

},{"../../util":12}],8:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../../util')
  , isArray = util.isArray;

var wrap = require('./wrap');

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
  var temp = value.slice(0).order();
  if ( temp.length % 2 === 0 ) {
    var mid = temp.length / 2;
    return (temp[mid - 1] + temp[mid]) / 2;
  }
  return temp[(temp.length + 1) / 2];
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

// ### Math functions

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

},{"../../util":12,"./wrap":10}],9:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../../util')
  , stringify = util.stringify;

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
  var val = stringify(value).split(delim || ' \n\r\t');
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

},{"../../util":12,"./wrap":10}],10:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../../util')
  , bless = util.bless;

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

},{"../../util":12}],11:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util')
  , format = require('./format')
  , match = require('./match');

var arrayWriter = require('./writers/array')
  , nullWriter = require('./writers/null');

var isArray = util.isArray
  , mixin = util.mixin
  , isTruthy = util.isTruthy
  , configure = util.configure
  , extendObject = util.extendObject
  , freezeObject = util.freezeObject
  , objectKeys = util.objectKeys
  , isInterpolFunction = util.isInterpolFunction
  , createStaticMixin = util.createStaticMixin
  , buildTemplate = format.buildTemplate
  , isMatchingObject = match.isMatchingObject
  , buildMatcher = match.buildMatcher;

var TemplateCacheMax = 256;

var slice = Array.prototype.slice;

var globalOptions = { writer: null, errorCallback: null }
  , globalContext = {}
  , globalResolvers = [];

/**
 * Converts a pre-compiled JSON instance to an evaluative runtime closure.
 *
 * @param {Object} parseOutput the pre-compiled JSON to use
 * @param {Object} [localOptions] Object for configuring the closure
 * @param {[Resolver]} [resolvers] Resolvers to use for performing imports
 * @param {boolean} [cache] whether or not to cache resolved imports
 */

function buildRuntime(parseOutput, localOptions) {
  var createArrayWriter = arrayWriter.createArrayWriter
    , NullWriter = nullWriter.createNullWriter();

  // A lookup table of code-path generators
  var Evaluators = freezeObject({
    im: createImportEvaluator,
    de: createPartialEvaluator,
    bi: createBindEvaluator,
    ca: createCallEvaluator,
    as: createAssignEvaluator,
    op: createOpenTagEvaluator,
    cl: createCloseTagEvaluator,
    ct: createCommentTagEvaluator,
    dt: createDocTypeEvaluator,
    ou: createOutputEvaluator,
    ra: createRawOutputEvaluator,
    fr: createForEvaluator,
    us: createUsingEvaluator,
    cn: createConditionalEvaluator,
    or: createOrEvaluator,
    an: createAndEvaluator,
    eq: createEqEvaluator,
    ma: createMatchEvaluator,
    nq: createNeqEvaluator,
    gt: createGtEvaluator,
    lt: createLtEvaluator,
    ge: createGteEvaluator,
    le: createLteEvaluator,
    ad: createAddEvaluator,
    su: createSubEvaluator,
    mu: createMulEvaluator,
    di: createDivEvaluator,
    mo: createModEvaluator,
    fm: createFormatEvaluator,
    no: createNotEvaluator,
    ne: createNegEvaluator,
    mb: createMemberEvaluator,
    ar: createArrayEvaluator,
    dc: createDictionaryEvaluator,
    id: createIdEvaluator,
    se: createSelfEvaluator
  });

  // literals are stored in the `l` property of parseOutput, while the parse
  // tree is stored in the `n` property.  Since a parsed Interpol module
  // is simply a set of statements, we can create a statementsEvaluator and
  // call it a day.

  var lits = parseOutput.l
    , runtimeOptions = mixin({}, globalOptions, localOptions)
    , cacheModules = runtimeOptions.cache
    , resolvers = runtimeOptions.resolvers || globalResolvers
    , evaluator = wrapLiteral(createStatementsEvaluator(parseOutput.n))
    , exportedContext = null;

  runtimeTemplate.configure = configureTemplate;
  runtimeTemplate.exports = templateExports;
  return freezeObject(runtimeTemplate);

  /**
   * The result of a runtime processing is this closure.  `obj` is the
   * Object to be used as a working context, while `localOptions` are
   * options to be applied to a particular rendering.  If no `errorCallback`
   * is provided, calls to this function may throw errors.
   *
   * @param {Object} obj the context Object to be rendered
   * @param {Object} [localOptions] Object for configuring the current render
   * @param {Writer} [localOptions.writer] an alternative Writer to use
   * @param {Function} [localOptions.errorCallback] a callback for errors
   */

  function runtimeTemplate(obj, localOptions) {
    var ctx = mixin(extendObject(globalContext), obj)
      , processingOptions = mixin({}, globalOptions, localOptions);

    // If no Writer is provided, create a throw-away Array Writer
    var writer = processingOptions.writer || createArrayWriter();

    try {
      writer.startRender();
      evaluator(ctx, writer);
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
    return configure(runtimeTemplate, 0, slice.call(arguments, 0));
  }

  /**
   * Returns the symbols (partials and assignments) that the runtime
   * template will product against an empty `{}` context Object.  This is
   * the method by which Interpol imports work.  Partials produced with
   * this method still have access to the global context.
   */

  function templateExports() {
    if ( exportedContext ) {
      return exportedContext;
    }

    // `__intExports` is an indicator to evaluators that we're processing
    // exports and so they can be a bit lax about reporting errors or
    // resolving imports

    exportedContext = extendObject(globalContext);
    exportedContext.__intExports = true;
    evaluator(exportedContext, NullWriter);
    delete exportedContext.__intExports;

    return exportedContext;
  }

  // ## Evaluator Generation Utilities

  function wrapLiteral(value) {
    // if value is already a Function, we don't have to wrap it
    if ( typeof value === 'function' ) {
      return value;
    }
    return wrapper;

    function wrapper() {
      return value;
    }
  }

  // Given an array of nodes, create evaluators for each element
  function wrapArrayEvaluators(arrayNodes) {
    if ( !arrayNodes ) {
      return [];
    }

    var result = [];
    for ( var i = arrayNodes.length - 1; i >= 0; i-- ) {
      result[i] = wrapLiteral(createEvaluator(arrayNodes[i]));
    }
    return result;
  }

  // Given an array of literal ids, expand them to real values
  function expandLiterals(literalArray) {
    if ( !literalArray ) {
      return [];
    }

    var result = [];
    for ( var i = literalArray.length - 1; i >= 0; i-- ) {
      result[i] = lits[literalArray[i]];
    }
    return result;
  }

  // wrap evaluators for processing HTML attributes, including the attribute
  // names, since they can also be represented by expressions
  function wrapAttributeEvaluators(keyValueNodes) {
    if ( !keyValueNodes ) {
      return [];
    }

    var result = [];
    for ( var i = 0, len = keyValueNodes.length; i < len; i++ ) {
      var keyValueNode = keyValueNodes[i];
      result[i] = [createEvaluator(keyValueNode[0]),
                  createEvaluator(keyValueNode[1])];
    }
    return result;
  }

  // wrap evaluators for local variable assignments, name is always a literal
  function wrapAssignmentEvaluators(assignNodes) {
    if ( !assignNodes ) {
      return [];
    }

    var result = [];
    for ( var i = 0, len = assignNodes.length; i < len; i++ ) {
      var assignNode = assignNodes[i];
      result[i] = [lits[assignNode[0]],
                  wrapLiteral(createEvaluator(assignNode[1]))];
    }
    return result;
  }

  /**
   * The busiest function in the runtime process.  createEvaluator
   * resolves the evaluator generation function to use by taking the
   * first element of the node array.  It then passes the rest of the
   * node's elements as arguments to that generation function.
   *
   * @param {Array|Number} node Either an Array or a Literal Id
   */

  function createEvaluator(node) {
    if ( !isArray(node) ) {
      if ( node === null || node === undefined ) {
        return null;
      }
      return lits[node];
    }

    var nodeType = lits[node[0]]
      , createFunction = Evaluators[nodeType];

    if ( !createFunction ) {
      throw new Error("Invalid Node in Parse Tree: " + nodeType);
    }

    return createFunction.apply(node, node.slice(1));
  }

  function createStatementsEvaluator(statementNodes) {
    if ( statementNodes.length === 1 ) {
      return createEvaluator(statementNodes[0]);
    }

    var statements = wrapArrayEvaluators(statementNodes).reverse()
      , slen = statements.length - 1;

    return statementsEvaluator;

    function statementsEvaluator(ctx, writer) {
      for ( var i = slen; i >= 0; i-- ) {
        statements[i](ctx, writer);
      }
    }
  }

  /**
   * Depending on the value types for `left` and `right`, will return an
   * index into an Array for choosing the best code-path to take in
   * evaluating an operator.  0=both are literals, 1=left is a function,
   * 2=right is a function, 3=both are functions.
   *
   * @param {Function|Mixed} left the left operand
   * @param {Function|Mixed} right the right operand
   */

  function getBinaryType(left, right) {
    var l = typeof left === 'function' ? 1 : 0
      , r = typeof right === 'function' ? 2 : 0;
    return l | r;
  }

  // ## Evaluator Generation

  // generate an evaluator to deal with 'from' and 'import' statements
  function createImportEvaluator(fromNodes) {
    var importList = []
      , ilen = fromNodes.length - 1
      , evaluator = cacheModules ? cacheableEvaluator : dynamicEvaluator;

    for ( var i = ilen; i >= 0; i-- ) {
      var fromNode = fromNodes[i]
        , moduleName = lits[fromNode[0]]
        , aliases = fromNode[1]
        , moduleAlias = null
        , toResolve = null;

      if ( isArray(aliases) ) {
        toResolve = [];
        for ( var j = aliases.length - 1; j >= 0; j-- ) {
          var importInfo = aliases[j]
            , name = lits[importInfo[0]]
            , alias = importInfo[1] ? lits[importInfo[1]] : name;
          toResolve.push([alias, name]);
        }
      }
      else if ( typeof aliases === 'number' ) {
        moduleAlias = lits[aliases];
      }
      else {
        moduleAlias = moduleName.split('/').pop();
      }

      importList.push([moduleName, moduleAlias, toResolve]);
    }

    return importEvaluator;

    function importEvaluator(ctx, writer) {
      // have to call it like this because we can't override importEvaluator
      // after it has been returned to a parent evaluator
      evaluator(ctx, writer);
    }

    // if moduleCaching is on, we use the cachable form of the evaluator
    function cacheableEvaluator(ctx, writer) {
      if ( ctx.__intExports ) {
        dynamicEvaluator(ctx, writer);
        return;
      }

      var target = {};
      dynamicEvaluator(target, writer);
      evaluator = createStaticMixin(target);
      evaluator(ctx);
    }

    // if moduleCaching is off, we resolve the exports every time
    function dynamicEvaluator(ctx, writer) {
      for ( var i = ilen; i >= 0; i-- ) {
        var importItem = importList[i]
          , moduleName = importItem[0]
          , moduleAlias = importItem[1]
          , toResolve = importItem[2];

        var moduleExports = resolveExports(moduleName, true);

        if ( toResolve ) {
          for ( var j = toResolve.length - 1; j >= 0; j-- ) {
            var aliasMap = toResolve[j];
            ctx[aliasMap[0]] = moduleExports[aliasMap[1]];
          }
        }
        else {
          ctx[moduleAlias] = moduleExports;
        }
      }
    }

    // where exports are actually resolved. raiseError will be false
    // if we're in the process of evaluating a template for the purpose
    // of yielding its exports
    function resolveExports(moduleName, raiseError) {
      var module = null;
      for ( var i = resolvers.length - 1; i >= 0; i-- ) {
        module = resolvers[i].resolveExports(moduleName, runtimeOptions);
        if ( module ) {
          break;
        }
      }
      if ( !module && raiseError ) {
        throw new Error("Module '" + moduleName +"' not resolved");
      }
      return module;
    }
  }

  function isInterpolPartial(func) {
    return typeof func === 'function' && func.__intFunction === 'part';
  }

  // generate an evaluator to represent a partial and its associated closure
  function createPartialEvaluator(nameLiteral, paramDefs,
                                  statementNodes, guardNode) {
    var name = lits[nameLiteral]
      , params = [null].concat(expandLiterals(paramDefs))
      , plen = params.length
      , statements = createStatementsEvaluator(statementNodes)
      , guard = guardNode && createEvaluator(guardNode);

    return guard ? guardedClosureEvaluator : unguardedClosureEvaluator;

    function unguardedClosureEvaluator(ctx /*, writer */) {
      ctx[name] = callEvaluator;
      callEvaluator.__intFunction = 'part';
      callEvaluator.__intEvaluator = bodyEvaluator;

      function callEvaluator(writer) {
        statements(createCallContext(ctx, callEvaluator, arguments), writer);
        return null;
      }

      function bodyEvaluator(writer) {
        statements(createCallContext(ctx, callEvaluator, arguments), writer);
        return true;
      }
    }

    function guardedClosureEvaluator(ctx /*, writer */) {
      var bodyEvaluator, oldEvaluator, newEvaluator;
      if ( !ctx.hasOwnProperty(name) || !isInterpolPartial(ctx[name]) ) {
        bodyEvaluator = guardedBodyEvaluator;
      }
      else {
        oldEvaluator = ctx[name].__intEvaluator;
        bodyEvaluator = branchedBodyEvaluator;
        newEvaluator = guardedBodyEvaluator;
      }
      ctx[name] = callEvaluator;
      callEvaluator.__intFunction = 'part';
      callEvaluator.__intEvaluator = bodyEvaluator;

      function callEvaluator() {
        /* jshint validthis:true */
        bodyEvaluator.apply(this, arguments);
        return null;
      }

      function guardedBodyEvaluator(writer) {
        var newCtx = createCallContext(ctx, callEvaluator, arguments);
        if ( guard(newCtx, writer) ) {
          statements(newCtx, writer);
          return true;
        }
      }

      function branchedBodyEvaluator() {
        /* jshint validthis:true */
        return newEvaluator.apply(this, arguments) ||
               oldEvaluator.apply(this, arguments);
      }
    }

    // Creates a new calling context and stores its locals from arguments
    function createCallContext(parentCtx, callEvaluator, args) {
      var newCtx = extendObject(parentCtx);
      newCtx[name] = callEvaluator;
      for ( var i = 1; i < plen; i++ ) {
        newCtx[params[i]] = args[i];
      }
      return newCtx;
    }
  }

  // generate a bound call evaluator
  function createBindEvaluator(memberNode, argNodes) {
    var member = createEvaluator(memberNode)
      , args = wrapArrayEvaluators(argNodes)
      , alen = args.length;

    return bindEvaluator;

    function bindEvaluator(ctx, writer) {
      var func = member(ctx, writer);

      if ( !isInterpolFunction(func) ) {
        if ( ctx.__intExports ) {
          return null;
        }
        throw new Error("Attempting to bind an unblessed function");
      }

      var callArgs = [];
      for ( var i = 0; i < alen; i++ ) {
        callArgs[i] = args[i](ctx, writer);
      }

      var bound = configure(func, 1, callArgs);
      bound.__intFunction = func.__intFunction;
      return bound;
    }
  }

  // generate an evaluator to perform a function or partial call
  function createCallEvaluator(memberNode, argNodes) {
    var member = createEvaluator(memberNode)
      , args = [null].concat(wrapArrayEvaluators(argNodes))
      , alen = args.length;

    return callEvaluator;

    // If we're in the process of gathering module exports, and the called
    // function can't be resolved, then just exit without exploding.
    // What happens inside of a function probably shouldn't influence the
    // top-level export context anyway
    function callEvaluator(ctx, writer) {
      var func = member(ctx, writer);

      if ( !isInterpolFunction(func) ) {
        if ( ctx.__intExports ) {
          return null;
        }
        throw new Error("Attempting to call an unblessed function");
      }

      var callArgs = [writer];
      for ( var i = 1; i < alen; i++ ) {
        callArgs[i] = args[i](ctx, writer);
      }

      return func.apply(null, callArgs);
    }
  }

  // generate an evaluator to perform local variable assignment
  function createAssignEvaluator(assignmentDefs) {
    var assigns = wrapAssignmentEvaluators(assignmentDefs).reverse()
      , alen = assigns.length - 1;

    return assignEvaluator;

    function assignEvaluator(ctx, writer) {
      for ( var i = alen; i >= 0; i-- ) {
        var assign = assigns[i];
        ctx[assign[0]] = assign[1](ctx, writer);
      }
    }
  }

  // generate an evaluator to write an html opening tag
  function createOpenTagEvaluator(nameNode, attributeDefs, selfClose) {
    var name = createEvaluator(nameNode)
      , attributes = wrapAttributeEvaluators(attributeDefs).reverse()
      , alen = attributes.length - 1;

    if ( typeof name === 'function' ) {
      return selfClose ? selfCloseFuncEvaluator : openTagFuncEvaluator;
    }
    return selfClose ? selfCloseLiteralEvaluator : openTagLiteralEvaluator;

    function selfCloseFuncEvaluator(ctx, writer) {
      writer.selfCloseElement(name(ctx, writer), getAttributes(ctx, writer));
    }

    function openTagFuncEvaluator(ctx, writer) {
      writer.startElement(name(ctx, writer), getAttributes(ctx, writer));
    }

    function selfCloseLiteralEvaluator(ctx, writer) {
      writer.selfCloseElement(name, getAttributes(ctx, writer));
    }

    function openTagLiteralEvaluator(ctx, writer) {
      writer.startElement(name, getAttributes(ctx, writer));
    }

    function getAttributes(ctx, writer) {
      var result = {};
      for ( var i = alen; i >= 0; i-- ) {
        var attribute = attributes[i]
          , key = attribute[0];

        if ( typeof key === 'function' ) {
          key = key(ctx, writer);
          if ( key === null ) {
            continue;
          }
        }

        var val = attribute[1];
        if ( typeof val === 'function' ) {
          val = val(ctx, writer);
        }
        result[key] = val;
      }
      return freezeObject(result);
    }
  }

  // generate an evaluator to write an html closing tag
  function createCloseTagEvaluator(nameNode) {
    var name = createEvaluator(nameNode)
      , name_func = typeof name === 'function';

    return name_func ? closeFuncEvaluator : closeLiteralEvaluator;

    function closeFuncEvaluator(ctx, writer) {
      writer.endElement(name(ctx, writer));
    }

    function closeLiteralEvaluator(ctx, writer) {
      writer.endElement(name);
    }
  }

  // generate an evaluator to write an html comment
  function createCommentTagEvaluator(contentLiteral) {
    var content = lits[contentLiteral];

    return commentTagEvaluator;

    function commentTagEvaluator(ctx, writer) {
      writer.comment(content);
    }
  }

  // generate an evaluator to write an html5 doctype
  function createDocTypeEvaluator(rootElemLiteral) {
    var rootElem = lits[rootElemLiteral];

    return docTypeEvaluator;

    function docTypeEvaluator(ctx, writer) {
      writer.docType(rootElem);
    }
  }

  // generate an evaluator that writes the result of an expression
  function createOutputEvaluator(exprNode) {
    var $1 = createEvaluator(exprNode);

    return typeof $1 !== 'function' ? outputLiteral : outputEvaluator;

    function outputEvaluator(ctx, writer) {
      writer.content($1(ctx, writer));
    }

    function outputLiteral(ctx, writer) {
      writer.content($1);
    }
  }

  // generate an evaluator that writes the result of an
  // expression without escaping
  function createRawOutputEvaluator(exprNode) {
    var $1 = createEvaluator(exprNode);

    return typeof $1 !== 'function' ? outputLiteral : outputEvaluator;

    function outputEvaluator(ctx, writer) {
      writer.rawContent($1(ctx, writer));
    }

    function outputLiteral(ctx, writer) {
      writer.rawContent($1);
    }
  }

  // generate an evaluator that performs for looping over ranges
  function createForEvaluator(rangeNodes, statementNodes, elseNodes) {
    var ranges = []
      , rlen = rangeNodes.length
      , statements = createStatementsEvaluator(statementNodes)
      , elseStatements = elseNodes && createStatementsEvaluator(elseNodes);

    for ( var i = 0, len = rangeNodes.length; i < len; i++ ) {
      var rangeNode = rangeNodes[i];
      ranges[i] = [
        lits[rangeNode[0]],
        wrapLiteral(createEvaluator(rangeNode[1])),
        rangeNode[2] && wrapLiteral(createEvaluator(rangeNode[2]))
      ];
    }
    ranges.reverse();

    return forEvaluator;

    function forEvaluator(ctx, writer) {
      // The entire for loop is only a single nested context
      var newCtx = extendObject(ctx)
        , statementsEvaluated = false;

      processRange(rlen - 1);
      if ( !statementsEvaluated && elseStatements ) {
        elseStatements(ctx, writer);
      }

      function processRange(idx) {
        var range = ranges[idx]
          , name = range[0]
          , data = range[1](newCtx, writer)
          , guard = range[2]
          , items = data;

        if ( typeof data !== 'object') {
          return;
        }

        var createItem;
        if ( isArray(data) ) {
          createItem = createArrayItem;
        }
        else {
          items = objectKeys(data);
          createItem = createObjectItem;
        }

        for ( var i = 0, len = items.length; i < len; i++ ) {
          newCtx[name] = createItem(i);
          if ( guard && !guard(newCtx, writer) ) {
            continue;
          }
          if ( idx ) {
            processRange(idx - 1);
          }
          else {
            statements(newCtx, writer);
            statementsEvaluated = true;
          }
        }

        function createArrayItem() {
          return data[i];
        }

        function createObjectItem() {
          var name = items[i];
          return { name: name, value: data[name] };
        }
      }
    }
  }

  // generate an evaluator that borrows the specified expressions
  // as the block's new context for locals (remaining immutable)
  function createUsingEvaluator(exprsNode, statementNodes) {
    var exprs = [null].concat(wrapArrayEvaluators(exprsNode))
      , elen = exprs.length
      , statements = createStatementsEvaluator(statementNodes);

    return usingEvaluator;

    function usingEvaluator(ctx, writer) {
      var newCtx = extendObject(ctx)
        , args = [newCtx];

      for ( var i = 1; i < elen; i++ ) {
        args[i] = exprs[i](ctx, writer);
      }

      mixin.apply(null, args);
      statements(newCtx, writer);
    }
  }

  // generate a conditional evaluator (if/else or ternary)
  function createConditionalEvaluator(conditionNode, trueNodes, falseNodes) {
    var $1 = createEvaluator(conditionNode)
      , $2 = createStatementsEvaluator(trueNodes)
      , $3 = createStatementsEvaluator(falseNodes);

    if ( typeof $1 !== 'function' ) {
      return isTruthy($1) ? $2 : $3;
    }

    var type = getBinaryType($2, $3);
    return [condLiteral, condTrue, condFalse, condBoth][type];

    function condLiteral(c, w) {
      return isTruthy($1(c, w)) ? $2 : $3;
    }

    function condTrue(c, w) {
      return isTruthy($1(c, w)) ? $2(c, w) : $3;
    }

    function condFalse(c, w) {
      return isTruthy($1(c, w)) ? $2 : $3(c, w);
    }

    function condBoth(c, w) {
      return isTruthy($1(c, w)) ? $2(c, w) : $3(c, w);
    }
  }

  // generate an 'or' evaluator, including short circuiting
  function createOrEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode);

    if ( typeof $1 !== 'function' ) {
      return isTruthy($1) ? $1 : $2;
    }

    return typeof $2 === 'function' ? orFuncEvaluator : orLiteralEvaluator;

    function orFuncEvaluator(ctx, writer) {
      var lval = $1(ctx, writer);
      return isTruthy(lval) ? lval : $2(ctx, writer);
    }

    function orLiteralEvaluator(ctx, writer) {
      var lval = $1(ctx, writer);
      return isTruthy(lval) ? lval : $2;
    }
  }

  // generate an 'and' evaluator, including short circuiting
  function createAndEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode);

    if ( typeof $1 !== 'function' ) {
      return isTruthy($1) ? $2 : $1;
    }

    return typeof $2 === 'function' ? andFuncEvaluator : andLiteralEvaluator;

    function andFuncEvaluator(ctx, writer) {
      var lval = $1(ctx, writer);
      return isTruthy(lval) ? $2(ctx, writer) : lval;
    }

    function andLiteralEvaluator(ctx, writer) {
      var lval = $1(ctx, writer);
      return isTruthy(lval) ? $2 : lval;
    }
  }

  // generate a match evaluator
  function createMatchEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode);

    switch ( getBinaryType($1, $2) ) {
      case 0: return isMatchingObject($2, $1);
      case 1: $2 = buildMatcher($2); return maLeft;
      case 2: return maRight;
      case 3: return maBoth;
    }

    function maLeft(c, w) { return $2($1(c, w)); }
    function maRight(c, w) { return isMatchingObject($2(c, w), $1); }
    function maBoth(c, w) { return isMatchingObject($2(c, w), $1(c, w)); }
  }

  // generate an equality evaluator
  function createEqEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, eqLeft, eqRight, eqBoth][type] || ($1 === $2);

    function eqLeft(c, w) { return $1(c, w) === $2; }
    function eqRight(c, w) { return $1 === $2(c, w); }
    function eqBoth(c, w) { return $1(c, w) === $2(c, w); }
  }

  // generate an inequality evaluator
  function createNeqEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, neqLeft, neqRight, neqBoth][type] || ($1 !== $2);

    function neqLeft(c, w) { return $1(c, w) !== $2; }
    function neqRight(c, w) { return $1 !== $2(c, w); }
    function neqBoth(c, w) { return $1(c, w) !== $2(c, w); }
  }

  // generate a greater-than evaluator
  function createGtEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, gtLeft, gtRight, gtBoth][type] || ($1 > $2);

    function gtLeft(c, w) { return $1(c, w) > $2; }
    function gtRight(c, w) { return $1 > $2(c, w); }
    function gtBoth(c, w) { return $1(c, w) > $2(c, w); }
  }

  // generate a greater-than or equal to evaluator
  function createGteEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, gteLeft, gteRight, gteBoth][type] || ($1 >= $2);

    function gteLeft(c, w) { return $1(c, w) >= $2; }
    function gteRight(c, w) { return $1 >= $2(c, w); }
    function gteBoth(c, w) { return $1(c, w) >= $2(c, w); }
  }

  // generate a less-than evaluator
  function createLtEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, ltLeft, ltRight, ltBoth][type] || ($1 < $2);

    function ltLeft(c, w) { return $1(c, w) < $2; }
    function ltRight(c, w) { return $1 < $2(c, w); }
    function ltBoth(c, w) { return $1(c, w) < $2(c, w); }
  }

  // generate a less-than or equal to evaluator
  function createLteEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, lteLeft, lteRight, lteBoth][type] || ($1 <= $2);

    function lteLeft(c, w) { return $1(c, w) <= $2; }
    function lteRight(c, w) { return $1 <= $2(c, w); }
    function lteBoth(c, w) { return $1(c, w) <= $2(c, w); }
  }

  // generate an addition evaluator
  function createAddEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, addLeft, addRight, addBoth][type] || ($1 + $2);

    function addLeft(c, w) { return $1(c, w) + $2; }
    function addRight(c, w) { return $1 + $2(c, w); }
    function addBoth(c, w) { return $1(c, w) + $2(c, w); }
  }

  // generate a subtraction evaluator
  function createSubEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, subLeft, subRight, subBoth][type] || ($1 - $2);

    function subLeft(c, w) { return $1(c, w) - $2; }
    function subRight(c, w) { return $1 - $2(c, w); }
    function subBoth(c, w) { return $1(c, w) - $2(c, w); }
  }

  // generate a multiplication evaluator
  function createMulEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, mulLeft, mulRight, mulBoth][type] || ($1 * $2);

    function mulLeft(c, w) { return $1(c, w) * $2; }
    function mulRight(c, w) { return $1 * $2(c, w); }
    function mulBoth(c, w) { return $1(c, w) * $2(c, w); }
  }

  // generate a division evaluator
  function createDivEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, divLeft, divRight, divBoth][type] || ($1 / $2);

    function divLeft(c, w) { return $1(c, w) / $2; }
    function divRight(c, w) { return $1 / $2(c, w); }
    function divBoth(c, w) { return $1(c, w) / $2(c, w); }
  }

  // generate a remainder evaluator
  function createModEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, modLeft, modRight, modBoth][type] || ($1 % $2);

    function modLeft(c, w) { return $1(c, w) % $2; }
    function modRight(c, w) { return $1 % $2(c, w); }
    function modBoth(c, w) { return $1(c, w) % $2(c, w); }
  }

  // generate an interpolation evaluator
  function createFormatEvaluator(formatNode, exprNode) {
    var $1 = createEvaluator(formatNode)
      , $1_func = typeof $1 === 'function'
      , $2 = createEvaluator(exprNode)
      , $2_func = typeof $2 === 'function';

    var template = null;
    if ( !$1_func ) {
      // we can cache everything if the left operand is a literal
      template = buildTemplate($1);
      if ( $2_func ) {
        return builtExpressionEvaluator;
      }
      if ( template.__requiresContext ) {
        return builtLiteralEvaluator;
      }
      return template($2);
    }

    var cache = {}
      , cacheCount = 0;

    // otherwise, we have to evaluate the interpolation every time
    return dynamicFormatEvaluator;

    function builtExpressionEvaluator(ctx, writer) {
      return template($2(ctx, writer), ctx);
    }

    function builtLiteralEvaluator(ctx, writer) {
      return template($2, ctx);
    }

    // If we exhaust TemplateCacheMax, then something is clearly wrong here
    // and we're not using the evaluator for localized strings.  If we keep
    // caching, we're going to start leaking memory.  So this evaluator will
    // blow away the cache and start over
    function dynamicFormatEvaluator(ctx, writer) {
      var formatStr = $1(ctx, writer)
        , data = $2_func ? $2(ctx, writer) : $2
        , dynamicTemplate = cache[formatStr];

      if ( !dynamicTemplate ) {
        if ( cacheCount >= TemplateCacheMax ) {
          cache = {};
          cacheCount = 0;
        }
        // build and cache the dynamic template
        dynamicTemplate = buildTemplate(formatStr);
        cache[formatStr] = dynamicTemplate;
        cacheCount++;
      }

      return dynamicTemplate(data, ctx);
    }
  }

  // generate a logical 'not' evaluator
  function createNotEvaluator(node) {
    var $1 = createEvaluator(node);
    return typeof $1 === 'function' ? notEvaluator : !isTruthy($1);

    function notEvaluator(ctx, writer) {
      return !isTruthy($1(ctx, writer));
    }
  }

  // generate a mathematic negation evaluator
  function createNegEvaluator(node) {
    var $1 = createEvaluator(node);
    return typeof $1 === 'function' ? negEvaluator : -$1;

    function negEvaluator(ctx, writer) {
      return -$1(ctx, writer);
    }
  }

  // generate an array or object member access evaluator
  function createMemberEvaluator(parentNode, elemNode) {
    var $1 = createEvaluator(parentNode);

    if ( $1 === null ) {
      return null;
    }

    var $2 = createEvaluator(elemNode)
      , type = getBinaryType($1, $2);

    return [null, memLeft, null, memBoth][type] || ($1[$2]);

    function memLeft(c, w) {
      var parent = $1(c, w);
      if ( parent === null ) {
        return null;
      }
      var result = parent[$2];
      return result === undefined ? null : result;
    }

    function memBoth(c, w) {
      var parent = $1(c, w);
      if ( parent === null ) {
        return null;
      }
      var result = parent[$2(c, w)];
      return result === undefined ? null : result;
    }
  }

  // generate an array evaluator
  function createArrayEvaluator(elemNodes) {
    var elems = wrapArrayEvaluators(elemNodes)
      , elen = elems.length;

    return arrayEvaluator;

    function arrayEvaluator(ctx, writer) {
      var result = [];
      for ( var i = 0; i < elen; i++ ) {
        result[i] = elems[i](ctx, writer);
      }
      return freezeObject(result);
    }
  }

  // generate a dictionary evaluator
  function createDictionaryEvaluator(assignmentDefs) {
    var assigns = wrapAssignmentEvaluators(assignmentDefs).reverse()
      , alen = assigns.length - 1;

    return dictionaryEvaluator;

    function dictionaryEvaluator(ctx, writer) {
      var dict = {};
      for ( var i = alen; i >= 0; i-- ) {
        var assign = assigns[i];
        dict[assign[0]] = assign[1](ctx, writer);
      }
      return freezeObject(dict);
    }
  }

  // generate a local variable retrieval evaluator
  function createIdEvaluator(nameLiteral) {
    var name = lits[nameLiteral];
    return idEvaluator;

    function idEvaluator(ctx, writer) {
      var result = ctx[name];
      return result === undefined ? null : result;
    }
  }

  // generate a self-reference evaluator
  function createSelfEvaluator() {
    return selfEvaluator;

    function selfEvaluator(ctx, writer) {
      return ctx;
    }
  }
}

function options() {
  return globalOptions;
}

function globals() {
  return globalContext;
}

function resolvers() {
  return globalResolvers;
}

// Exported Functions
exports.buildRuntime = buildRuntime;
exports.options = options;
exports.globals = globals;
exports.resolvers = resolvers;

},{"./format":2,"./match":4,"./util":12,"./writers/array":13,"./writers/null":15}],12:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

// ## Array and Object Handling

var toString = Object.prototype.toString
  , slice = Array.prototype.slice;

var isArray = Array.isArray;
if ( !isArray ) {
  isArray = (function () {
    return function _isArray(obj) {
      return obj && obj.length && toString.call(obj) === '[object Array]';
    };
  })();
}

var extendObject = Object.create;
if ( !extendObject ) {
  extendObject = (function () {
    function FakeConstructor() {}

    return function _extendContext(obj) {
      FakeConstructor.prototype = obj;
      return new FakeConstructor();
    };
  })();
}

var freezeObject = Object.freeze;
if ( !freezeObject ) {
  freezeObject = (function () {
    return function _freezeObject(obj) {
      return obj;
    };
  })();
}

var objectKeys = Object.keys;
if ( !objectKeys ) {
  objectKeys = (function () {
    return function _objectKeys(obj) {
      var keys = [];
      for ( var key in obj ) {
        if ( obj.hasOwnProperty(key) ) {
          keys.push(key);
        }
      }
      return keys;
    };
  });
}

function mixin(target) {
  for ( var i = 1, ilen = arguments.length; i < ilen; i++ ) {
    var src = arguments[i];
    if ( !src || typeof src !== 'object') {
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
 * Creates a closure whose job it is to mix the configured Object's
 * properties into a target provided to the closure.
 *
 * @param {Object} obj the Object to copy (will be frozen)
 */

function createStaticMixin(obj) {
  var keys = objectKeys(freezeObject(obj)).reverse()
    , klen = keys.length - 1;

  return staticMixin;

  function staticMixin(target) {
    for ( var i = klen; i >= 0; i-- ) {
      var key = keys[i];
      target[key] = obj[key];
    }
    return target;
  }
}

/**
 * Checks whether or not the provided value is an Interpol pre-compiled JSON
 * Object.
 *
 * @param {Object} value an Object to be checked
 */

function isInterpolJSON(value) {
  return typeof value === 'object' &&
    value !== null &&
    value.i === 'interpol' &&
    typeof value.v === 'string' &&
    !isArray(value) &&
    isArray(value.l) &&
    isArray(value.n);
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

// ## String Handling

var EscapeChars = freezeObject({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
});

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

// ## Exceptions

/**
 * Intercepts a PEG.js Exception and generate a human-readable error message.
 *
 * @param {Exception} err the Exception that was raised
 * @param {String} [filePath] path to the file that was being parsed
 */

function formatSyntaxError(err, filePath) {
  if ( !err.name || err.name !== 'SyntaxError') {
    return err;
  }

  var unexpected = err.found ? "'" + err.found + "'" : "end of file"
    , errString = "Unexpected " + unexpected
    , lineInfo = ":" + err.line + ":" + err.column;

  return new Error((filePath || 'string') + lineInfo + ": " + errString);
}

function formatWarning(warning, filePath) {
  var lineInfo = ":" + warning.line + ":" + warning.column
    , warningString = warning.message;

  filePath = filePath || warning.filePath || 'string';
  return filePath + lineInfo + ": " + warningString;
}

// ## Function Invocation

/**
 * Returns whether or not a Function is 'blessed' as Interpol-compatible.
 *
 * @param {Function} func the Function to check
 */
function isInterpolFunction(func) {
  return typeof func === 'function' && func.__intFunction;
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
    var args = slice.call(arguments, 0)
      , applyArgs = args.concat(argTemplate.slice(args.length));
    return func.apply(this, applyArgs);
  }
}

// Exported Functions
exports.isArray = isArray;
exports.extendObject = extendObject;
exports.freezeObject = freezeObject;
exports.objectKeys = objectKeys;
exports.mixin = mixin;
exports.createStaticMixin = createStaticMixin;
exports.isInterpolJSON = isInterpolJSON;
exports.isTruthy = isTruthy;
exports.escapeAttribute = escapeAttribute;
exports.escapeContent = escapeContent;
exports.stringify = stringify;
exports.formatSyntaxError = formatSyntaxError;
exports.formatWarning = formatWarning;
exports.isInterpolFunction = isInterpolFunction;
exports.bless = bless;
exports.configure = configure;

},{}],13:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util');

var freezeObject = util.freezeObject
  , stringify = util.stringify
  , escapeAttribute = util.escapeAttribute
  , escapeContent = util.escapeContent;

function noOp() {}

/**
 * Creates an Array Writer.  Interpol will create one by default if it is not
 * provided as an option to a compiled template.  An Array Writer manages the
 * writing of content as an Array of Strings.  This Array is joined and
 * returned when the `endRender()` function is called.
 *
 * @param {Array} [arr] The Array to manage, otherwise one is created
 */

function createArrayWriter(arr) {
  arr = arr || [];

  return freezeObject({
    startRender: noOp,
    endRender: endRender,
    startElement: startElement,
    selfCloseElement: selfCloseElement,
    endElement: endElement,
    comment: comment,
    docType: docType,
    content: content,
    rawContent: rawContent
  });

  function endRender() {
    return arr.join('');
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

  function content() {
    for ( var i = 0, len = arguments.length; i < len; i++ ) {
      arr.push(escapeContent(stringify(arguments[i])));
    }
  }

  function rawContent() {
    arr.push.apply(arr, arguments);
  }
}

// Exported Functions
exports.createArrayWriter = createArrayWriter;
interpol.createArrayWriter = createArrayWriter;

},{"../interpol":3,"../util":12}],14:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util')
  , array = require('./array');

var freezeObject = util.freezeObject
  , mixin = util.mixin
  , createArrayWriter = array.createArrayWriter;

var REPLACE = createDOMWriter.REPLACE = 'replace'
  , APPEND = createDOMWriter.APPEND = 'append'
  , INSERT = createDOMWriter.INSERT = 'insert';

/**
 * Creates a DOM Writer.  A DOM Writer attaches itself to a DOM Element,
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
  var arr = []
    , writer = createArrayWriter(arr)
    , endRender;

  switch ( renderMode ) {
    case APPEND:  endRender = appendEndRender; break;
    case INSERT:  endRender = insertEndRender; break;
    case REPLACE: endRender = replaceEndRender; break;
    default:      endRender = replaceEndRender;
  }

  return freezeObject(mixin({}, writer, {
    startRender: startRender,
    endRender: endRender
  }));

  function startRender() {
    // Just in case
    arr.length = 0;
  }

  function appendEndRender() {
    var container = document.createElement("span");
    container.innerHTML = arr.join('');
    arr.length = 0;
    parentElement.appendChild(container);
  }

  function insertEndRender() {
    var container = document.createElement("span");
    container.innerHTML = arr.join('');
    arr.length = 0;
    parentElement.insertBefore(container, parentElement.firstChild);
  }

  function replaceEndRender() {
    parentElement.innerHTML = arr.join('');
    arr.length = 0;
  }
}

// Exported Functions
exports.createDOMWriter = createDOMWriter;
interpol.createDOMWriter = createDOMWriter;

},{"../interpol":3,"../util":12,"./array":13}],15:[function(require,module,exports){
/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util');

var freezeObject = util.freezeObject;

function noOp() {}

/**
 * Creates a Null Writer.  All calls to this writer find their way into the
 * bit bucket.  Its primary purpose is to support the background rendering of
 * modules in order to yield their exported symbols.
 */
 
function createNullWriter() {
  return freezeObject({
    startRender: noOp,
    endRender: noOp,
    startElement: noOp,
    selfCloseElement: noOp,
    endElement: noOp,
    comment: noOp,
    docType: noOp,
    content: noOp,
    rawContent: noOp
  });
}

// Exported Functions
exports.createNullWriter = createNullWriter;
interpol.createNullWriter = createNullWriter;

},{"../interpol":3,"../util":12}]},{},[1])
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util')
  , isArray = util.isArray;

var slice = Array.prototype.slice;

// Implementation ***********************************************************

function createSystemResolver() {
  var modules = buildModules()
    , resolver = { resolveExports: resolveExports };

  return resolver;

  function resolveExports(name) {
    return modules[name];
  }
}

function wrapFunction(func) {
  wrappedFunction.__interpolPartial = true;
  return wrappedFunction;

  function wrappedFunction(writer) {
    /* jshint validthis:true */
    return func.apply(this, slice.call(arguments, 1));
  }
}

function buildModules() {
  return {
    "math": blessModule(buildMathModule()),
    "array": blessModule(buildArrayModule()),
    "string": blessModule(buildStringModule()),
    "json": blessModule(buildJSONModule())
  };
}

function blessModule(module) {
  var result = {};
  for ( var key in module ) {
    result[key] = interpol.bless(module[key]);
  }
  return result;
}

function buildMathModule() {
  return {
    "number": wrapFunction(Number),

    "abs": wrapFunction(Math.abs),
    "acos": wrapFunction(Math.acos),
    "asin": wrapFunction(Math.asin),
    "atan": wrapFunction(Math.atan),
    "atan2": wrapFunction(Math.atan2),
    "ceil": wrapFunction(Math.ceil),
    "cos": wrapFunction(Math.cos),
    "exp": wrapFunction(Math.exp),
    "floor": wrapFunction(Math.floor),
    "log": wrapFunction(Math.log),
    "pow": wrapFunction(Math.pow),
    "round": wrapFunction(Math.round),
    "sin": wrapFunction(Math.sin),
    "sqrt": wrapFunction(Math.sqrt),
    "tan": wrapFunction(Math.tan),
    
    "avg": function avg(writer, value) {
      if ( !isArray(value) ) {
        return typeof value === 'number' ? value : NaN;
      }
      if ( value.length === 0 ) return 0;
      for ( var i = 0, r = 0, l = value.length; i < l; r += value[i++] );
      return r / l;
    },

    "count": function count(writer, value) {
      return isArray(value) ? value.length : 0;
    },

    "max": function max(writer, value) {
      if ( !isArray(value) ) {
        return typeof value === 'number' ? value : NaN;
      }
      return Math.max.apply(Math, value);
    },

    "median": function median(writer, value) {
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
    },

    "min": function min(writer, value) {
      if ( !isArray(value) ) {
        return typeof value === 'number' ? value : NaN;
      }
      return Math.min.apply(Math, value);
    },

    "sum": function sum(writer, value) {
      if ( !isArray(value) ) {
        return typeof value === 'number' ? value : NaN;
      }
      for ( var i = 0, res = 0, l = value.length; i < l; res += value[i++] );
      return res;
    }
  };
}

function buildArrayModule() {
  return {
    "first": function first(writer, value) {
      if ( !isArray(value) ) {
        return value;
      }
      return value[0];
    },

    "last": function last(writer, value) {
      if ( !isArray(value) ) {
        return value;
      }
      if ( value.length ) return value[value.length - 1];
      return null;
    },

    "empty": function empty(writer, value) {
      if ( !isArray(value) ) {
        return typeof value === 'undefined' || value === null;
      }
      return !value.length;
    }
  };
}

function buildStringModule() {
  return {
    "string": wrapFunction(String),

    "lower": function lower(writer, value) {
      return typeof value === 'string' ? value.toLowerCase() : value;
    },

    "split": function split(writer, value, delim, idx) {
      var val = String(value).split(delim || ' \n\r\t');
      return typeof idx !== 'undefined' ? val[idx] : val;
    },

    "join": function join(writer, value, delim) {
      if ( Array.isArray(value) ) {
        return value.join(delim || '');
      }
      return value;
    },

    "title": function title(writer, value) {
      if ( typeof value !== 'string' ) return value;
      return value.replace(/\w\S*/g, function (word) {
        return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
      });
    },

    "upper": function upper(writer, value) {
      return typeof value === 'string' ? value.toUpperCase() : value;
    }
  };
}

function buildJSONModule() {
  return {
    "parse": wrapFunction(JSON.parse),
    "stringify": wrapFunction(JSON.stringify)
  };
}

// Exports
exports.createSystemResolver = createSystemResolver;
interpol.createSystemResolver = createSystemResolver;

/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var canBindCalls = !!Object.prototype.toString.call.bind;

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
var objectKeys = Object.keys;

var extendObject;
(function () {
  function FakeConstructor() {}
  var testProto = { __proto__: { works: true } };         // jshint ignore:line

  /* istanbul ignore else: won't happen in node */
  if ( testProto.works && objectKeys(testProto).length === 0 ) {
    extendObject = function _fastExtendObject(obj) {
      return { __proto__: obj };                          // jshint ignore:line
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
    var args = slice(arguments, 0);
    var applyArgs = args.concat(argTemplate.slice(args.length));
    return func.apply(this, applyArgs);
  }
}

var each;
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

var map;
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

var filter;
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
exports.configure = configure;

exports.each = each;
exports.map = map;
exports.filter = filter;
exports.selfMap = selfMap;

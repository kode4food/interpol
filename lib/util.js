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

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
  
  if ( typeof template !== 'object' || template === null ) {
    return template == obj;
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
  if ( typeof template !== 'object' || template === null ) {
    return valueMatcher;
  }
  if ( isArray(template) ) {
    return buildArrayMatcher(template);
  }
  return buildObjectMatcher(template);

  function valueMatcher(obj) {
    return template == obj;
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
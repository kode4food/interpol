/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util')
  , isArray = util.isArray;

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

// Exported Functions
exports.isMatchingObject = isMatchingObject;

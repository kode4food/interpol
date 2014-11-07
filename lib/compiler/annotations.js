/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');
var objectKeys = util.objectKeys;
var filter = util.filter;

function isAnnotations(node) {
  return typeof node === 'object' && node !== null && node.__intAnnotations;
}

function createAnnotations() {
  return {
    __intAnnotations: true
  };
}

function getAnnotations(node) {
  if ( isAnnotations(node) ) {
    return node;
  }

  var annotations = node.annotations;
  if ( !annotations ) {
    annotations = node.annotations = createAnnotations();
  }
  return annotations;
}

function annotate(node, group, name) {
  var annotations = getAnnotations(node);
  var groupObject = annotations[group];
  if ( !groupObject ) {
    groupObject = annotations[group] = {};
  }
  groupObject[name] = true;
}

function hasAnnotation(node, group, name) {
  var annotations = getAnnotations(node);
  var groupObject = annotations[group];
  if ( !groupObject ) {
    return false;
  }
  return groupObject[name];
}

// Exported Functions
exports.isAnnotations = isAnnotations;
exports.createAnnotations = createAnnotations;
exports.getAnnotations = getAnnotations;
exports.annotate = annotate;
exports.hasAnnotation = hasAnnotation;

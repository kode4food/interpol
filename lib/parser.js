/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util')
  , generatedParser  = require('../build/parser');

var isArray = util.isArray
  , mixin = util.mixin;

var ParamContextCheck = /(^|[^%])%[$_a-zA-Z][$_a-zA-Z0-9]*/m;

function parseTemplate(template) {
  return generatedParser.parse(template);
}

function buildBinaryChain(head, tail) {
  if ( !tail || !tail.length ) {
    return head;
  }

  for ( var i = 0, len = tail.length; i < len; i++ ) {
    var item = tail[i];
    head = [ item[0], head, item[1] ];
  }
  return head;
}

function sym(value, type, template) {
  if ( typeof type !== 'string' ) {
    template = type;
    type = null;
  }
  return mixin({}, template || {}, { value: value, type: type || 'op' });
}

function stmts(statements) {
  return { stmts: statements, type: 'stmts' };
}

function isDefined(value) {
  return value !== undefined && value !== null;
}

function isSymbol(node) {
  return isDefined(node) &&
         typeof node === 'object' &&
         node.value !== undefined &&
         node.type !== undefined;
}

function isStatements(node) {
  return isDefined(node) &&
         typeof node === 'object' &&
         node.stmts !== undefined &&
         node.type === 'stmts';
}

function isOperator(node, operator) {
  if ( !isArray(node) ) {
    return false;
  }
  var item = node[0];
  if ( !isSymbol(item) || item.type !== 'op' ) {
    return false;
  }
  if ( !operator ) {
    return item.value;
  }
  if ( !isArray(operator) ) {
    return item.value === operator ? operator : false;
  }
  var idx = operator.indexOf(item.value);
  if ( idx === -1 ) {
    return false;
  }
  return operator[idx];
}

function isAutoInterpolated(node) {
  return isSymbol(node) &&
         node.type === 'auto' &&
         typeof node.value === 'string' &&
         ParamContextCheck.test(node.value);
}

function isIdentifier(node) {
  return isSymbol(node) &&
         node.type === 'id';
}

function isPartialDef(statement) {
  return isOperator(statement, 'de');
}

function isForLoop(statement) {
  return isOperator(statement, 'fr');
}

// Exported Functions
exports.parseTemplate = parseTemplate;
exports.buildBinaryChain = buildBinaryChain;
exports.sym = sym;
exports.stmts = stmts;
exports.isDefined = isDefined;
exports.isSymbol = isSymbol;
exports.isStatements = isStatements;
exports.isOperator = isOperator;
exports.isAutoInterpolated = isAutoInterpolated;
exports.isPartialDef = isPartialDef;
exports.isForLoop = isForLoop;
exports.isIdentifier = isIdentifier;

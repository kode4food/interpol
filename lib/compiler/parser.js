/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');
var generatedParser = require('../../build/parser');

var isArray = util.isArray;
var mixin = util.mixin;
var each = util.each;

var ParamContextCheck = /(^|[^%])%[$_a-zA-Z][$_a-zA-Z0-9]*/m;

function parseTemplate(template) {
  return generatedParser.parse(template);
}

function buildBinaryChain(head, tail) {
  if ( !tail || !tail.length ) {
    return head;
  }

  each(tail, function (item) {
    head = [ item[0], head, item[1] ];
  });

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
  statements.stmts = true;
  return statements;
}

function symAutoInterpolate(value) {
  return sym(value, ParamContextCheck.test(value) ? 'auto' : 'lit');
}

function isDefined(value) {
  return value !== undefined && value !== null;
}

function isSymbol(node) {
  return isDefined(node) &&
         typeof node === 'object' &&
         node !== null &&
         node.value !== undefined &&
         node.type !== undefined;
}

function isStatements(node) {
  return isDefined(node) &&
         isArray(node) &&
         node.stmts === true;
}

function hasOperator(node, operator) {
  if ( !isArray(node) || isStatements(node) ) {
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
    operator = [operator];
  }
  var idx = operator.indexOf(item.value);
  if ( idx === -1 ) {
    return false;
  }
  return operator[idx];
}

function changeOperator(node, operator) {
  var item = node[0];
  // assert(isSymbol(item) && item.type === 'op');
  item.value = operator;
  return node;
}

function isAutoInterpolated(node) {
  return isSymbol(node) &&
         node.type === 'auto';
}

function isIdentifier(node) {
  return isSymbol(node) &&
         node.type === 'id';
}

function isLiteral(node) {
  return isSymbol(node) &&
         node.type === 'lit';
}

// Exceptions

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

  var unexpected = err.found ? "'" + err.found + "'" : "end of file";
  var errString = "Unexpected " + unexpected;
  var lineInfo = ":" + err.line + ":" + err.column;

  return new Error((filePath || 'string') + lineInfo + ": " + errString);
}

function formatWarning(warning, filePath) {
  var lineInfo = ":" + warning.line + ":" + warning.column;
  var warningString = warning.message;

  filePath = filePath || warning.filePath || 'string';
  return filePath + lineInfo + ": " + warningString;
}

// Exported Functions
exports.parseTemplate = parseTemplate;
exports.buildBinaryChain = buildBinaryChain;
exports.sym = sym;
exports.stmts = stmts;
exports.symAutoInterpolate = symAutoInterpolate;
exports.isDefined = isDefined;
exports.isSymbol = isSymbol;
exports.isStatements = isStatements;
exports.hasOperator = hasOperator;
exports.changeOperator = changeOperator;
exports.isAutoInterpolated = isAutoInterpolated;
exports.isIdentifier = isIdentifier;
exports.isLiteral = isLiteral;
exports.formatSyntaxError = formatSyntaxError;
exports.formatWarning = formatWarning;

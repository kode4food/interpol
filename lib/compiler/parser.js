/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('../util');
var formatter = require('../format');
var generatedParser = require('../../build/parser');

var isArray = util.isArray;
var mixin = util.mixin;
var each = util.each;
var buildFormatter = formatter.buildFormatter;

var formatterCache = {};

function parseTemplate(template) {
  var result = generatedParser.parse(template);
  formatterCache = {};
  return result;
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

function symbol(value, type, template) {
  if ( typeof type !== 'string' ) {
    template = type;
    type = null;
  }
  return mixin({}, template || {}, { value: value, type: type || 'op' });
}

function isSymbol(node) {
  return isDefined(node) &&
         typeof node === 'object' &&
         node !== null &&
         node.value !== undefined &&
         node.type !== undefined;
}

function literal(value) {
  return symbol(value, 'lit');
}

function isLiteral(node) {
  return isSymbol(node) &&
         node.type === 'lit';
}

function markStatements(value) {
  value._statements = true;
  return value;
}

function isStatements(node) {
  return isDefined(node) &&
         isArray(node) &&
         node._statements === true;
}

function interpolation(value, auto) {
  var testFormatter = formatterCache[value];
  if ( !testFormatter ) {
    testFormatter = formatterCache[value] = buildFormatter(value);
  }
  var requiredIndexes = testFormatter.__intRequiredIndexes || [];
  if ( !requiredIndexes.length ) {
    return literal(value);
  }
  var result = symbol(value, auto ? 'auto': 'int');
  result.formatter = testFormatter;
  return result;
}

function isInterpolation(node) {
  return isSymbol(node) &&
         (node.type === 'auto' || node.type === 'int');
}

function isDefined(value) {
  return value !== undefined && value !== null;
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
  item.value = operator;
  return node;
}

function isIdentifier(node) {
  return isSymbol(node) &&
         node.type === 'id';
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
exports.symbol = symbol;
exports.isSymbol = isSymbol;
exports.markStatements = markStatements;
exports.isStatements = isStatements;
exports.interpolation = interpolation;
exports.isInterpolation = isInterpolation;
exports.isDefined = isDefined;
exports.hasOperator = hasOperator;
exports.changeOperator = changeOperator;
exports.isIdentifier = isIdentifier;
exports.isLiteral = isLiteral;
exports.formatSyntaxError = formatSyntaxError;
exports.formatWarning = formatWarning;

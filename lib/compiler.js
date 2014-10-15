/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var interpol = require('./interpol');
var util = require('./util');
var parser = require('./parser');
var optimizer = require('./optimizer');
var codegen = require('./codegen/index');

var parseTemplate = parser.parseTemplate;
var optimizeModule = optimizer.optimizeModule;
var generateFunctionBody = index.generateTemplateBody;

var isArray = util.isArray;
var objectKeys = util.objectKeys;
var stringify = util.stringify;

var isSymbol = parser.isSymbol;

function compileModule(template) {
  var warnings = [];
  var lits = [];
  var reverseLits = {};

  var module = parseTemplate(template);
  var optimized = optimizeModule(module, warnings);
  var funcBody = generateFunctionBody({
    i: 'interpol',
    v: -1,
    l: lits,
    n: replaceSymbols(optimized)
  });
  return funcBody;

  // convert all symbol placeholders into symbol table entries for the
  // resulting output JSON
  function replaceSymbols(node) {
    if ( !isArray(node) ) {
      if ( isSymbol(node) ) {
        return lit(node.value);
      }
      return node;
    }
    for ( var i = 0, len = node.length; i < len; i++ ) {
      node[i] = replaceSymbols(node[i]);
    }
    return node;
  }

  function lit(value) {
    var canonical = JSON.stringify(value);
    var idx = reverseLits[canonical];
    if ( typeof idx === 'number' ) {
      return idx;
    }
    idx = lits.push(value) - 1;
    reverseLits[canonical] = idx;
    return idx;
  }
}

// Exported Functions
interpol.compileModule = exports.compileModule = compileModule;

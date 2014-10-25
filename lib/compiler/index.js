/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var interpol = require('../interpol');
var util = require('../util');
var parser = require('./parser');
var optimizer = require('./optimizer');
var codegen = require('./codegen');

var parseTemplate = parser.parseTemplate;
var optimizeModule = optimizer.optimizeModule;
var generateTemplateBody = codegen.generateTemplateBody;

var isArray = util.isArray;
var objectKeys = util.objectKeys;
var stringify = util.stringify;
var selfMap = util.selfMap;

var isSymbol = parser.isSymbol;

function compileModule(template, options) {
  var warnings = [];
  var literals = [];
  var reverseLiterals = {};

  var module = parseTemplate(template);
  var optimized = optimizeModule(module, warnings);
  return generateTemplateBody(replaceSymbols(optimized), literals, options);

  // convert all symbol placeholders into symbol table entries for the
  // resulting output JSON
  function replaceSymbols(node) {
    if ( !isArray(node) ) {
      if ( isSymbol(node) ) {
        return lit(node.value);
      }
      return node;
    }

    selfMap(node, function (item) {
      return replaceSymbols(item);
    });

    return node;
  }

  function lit(value) {
    var canonical = JSON.stringify(value);
    var idx = reverseLiterals[canonical];
    if ( typeof idx === 'number' ) {
      return idx;
    }
    idx = literals.push(value) - 1;
    reverseLiterals[canonical] = idx;
    return idx;
  }
}

// Exported Functions
interpol.compileModule = exports.compileModule = compileModule;

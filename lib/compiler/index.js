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
var rewriter = require('./rewriter');
var codegen = require('./codegen');

var parseTemplate = parser.parseTemplate;
var rewriteSyntaxTree = rewriter.rewriteSyntaxTree;
var generateModuleBody = codegen.generateModuleBody;

var isArray = util.isArray;
var objectKeys = util.objectKeys;
var stringify = util.stringify;
var selfMap = util.selfMap;

var isSymbol = parser.isSymbol;

function compileModule(template, options) {
  var warnings = [];
  var literals = [];
  var reverseLiterals = {};

  var parsed = parseTemplate(template);
  var rewritten = rewriteSyntaxTree(parsed, warnings);
  var stripped = replaceSymbols(rewritten);

  return {
    templateBody: generateModuleBody(stripped, literals, options),
    err: warnings
  };

  // convert all symbol placeholders into literal table entries
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

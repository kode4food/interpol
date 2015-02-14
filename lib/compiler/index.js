/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var vm = require('vm');

var util = require('../util');
var types = require('../types');
var parser = require('./parser');
var rewriter = require('./rewriter');
var codegen = require('./codegen');
var compilerStub = require('./stub');

var parseTemplate = parser.parseTemplate;
var rewriteSyntaxTree = rewriter.rewriteSyntaxTree;
var generateModuleBody = codegen.generateModuleBody;

var isArray = util.isArray;
var mixin = util.mixin;
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

function generateNodeModule(generatedCode) {
  var buffer = [];
  buffer.push("\"use strict\";");
  buffer.push("module.exports={");
  buffer.push("__intNodeModule: true,");
  buffer.push("createTemplate:function(r){");
  buffer.push(generatedCode);
  buffer.push("}};");
  return buffer.join('');
}

var generateFunction;
if ( typeof vm !== 'undefined' && typeof vm.createContext === 'function' ) {
  // The safer sandboxed method
  generateFunction = function _sandboxed(scriptCode) {
    var context = vm.createContext({
      module: { exports: {} }
    });
    vm.runInContext(generateNodeModule(scriptCode), context);
    return context.module.exports.createTemplate;
  };
}
else {
  // The shitty browser-based approach
  generateFunction = function _funcConstructed(scriptCode) {
    return new Function(['r'], scriptCode);
  };
}

// Exported Functions
exports.compileModule = compileModule;
exports.generateNodeModule = generateNodeModule;
exports.generateFunction = generateFunction;

mixin(compilerStub, exports);

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

// Set the Interpol browser global
window.$interpol = require('../lib/interpol');

// Resolvers
require('../lib/resolvers/system');
require('../lib/resolvers/helper');
require('../lib/resolvers/memory');

// Writers
require('../lib/writers/null');
require('../lib/writers/array');
require('../lib/writers/dom');

},{"../lib/interpol":3,"../lib/resolvers/helper":5,"../lib/resolvers/memory":6,"../lib/resolvers/system":8,"../lib/writers/array":13,"../lib/writers/dom":14,"../lib/writers/null":15}],2:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('./util')
  , stringify = util.stringify;

var nullWriter;

var Digits = "[1-9][0-9]*"
  , Ident = "[$_a-zA-Z][$_a-zA-Z0-9]*"
  , Params = "(.?)%(("+Digits+")|("+Ident+"))?(([|]"+Ident+")*)?";
             // "%" ( digits | identifier )? ( "|" identifier )*

var ParamRegex = new RegExp(Params);

function buildTemplate(formatStr) {
  var funcs = []
    , flen = 0
    , autoIdx = 0;

  while ( formatStr && formatStr.length ) {
    var paramMatch = ParamRegex.exec(formatStr);
    if ( !paramMatch ) {
      funcs.push(createLiteralFunction(formatStr));
      break;
    }

    var match = paramMatch[0]
      , matchIdx = paramMatch.index + paramMatch[1].length
      , matchLen = match.length - paramMatch[1].length;

    if ( paramMatch[1] === '%' ) {
      funcs.push(createLiteralFunction(formatStr.substring(0, matchIdx)));
      formatStr = formatStr.substring(matchIdx + matchLen);
      continue;
    }

    if ( matchIdx ) {
      funcs.push(createLiteralFunction(formatStr.substring(0, matchIdx)));
    }

    var idx = autoIdx++;
    if ( typeof paramMatch[4] !== 'undefined' ) {
      idx = paramMatch[4];
    }
    else if ( typeof paramMatch[3] !== 'undefined' ) {
      idx = parseInt(paramMatch[3], 10) - 1;
    }

    if ( typeof paramMatch[5] !== 'undefined' ) {
      var formatters = paramMatch[5].slice(1).split('|');
      funcs.push(createPipedFunction(idx, formatters));
      templateFunction.__requiresContext = true;
    }
    else {
      funcs.push(createIndexedFunction(idx));
    }

    formatStr = formatStr.substring(matchIdx + matchLen);
  }
  flen = funcs.length;

  return templateFunction;

  function templateFunction(data, ctx) {
    if ( typeof data !== 'object' || data === null ) {
      data = [data];
    }

    var output = [];
    for ( var i = 0; i < flen; i++ ) {
      output[i] = funcs[i](data, ctx);
    }

    return output.join('');
  }

  function createLiteralFunction(literal) {
    return literalFunction;

    function literalFunction() {
      return literal;
    }
  }

  function createIndexedFunction(idx) {
    return indexedFunction;

    function indexedFunction(data) {
      return stringify(data[idx]);
    }
  }

  function createPipedFunction(idx, formatters) {
    var funcs = formatters.reverse()
      , flen = funcs.length - 1;

    if ( !nullWriter ) {
      var createNullWriter = require('./writers/null').createNullWriter;
      nullWriter = createNullWriter();
    }

    return pipedFunction;

    function pipedFunction(data, ctx) {
      var value = data[idx];
      for ( var i = flen; i >= 0; i-- ) {
        var funcName = funcs[i]
          , func = data[funcName]
          , type = typeof func;

        if ( type === 'undefined' && ctx ) {
          // Only fall back to context if func is not in data at all
          func = ctx[funcName];
          type = typeof func;
        }

        if ( type !== 'function' || !func.__interpolFunction ) {
          if ( ctx.__interpolExports ) {
            continue;
          }
          throw new Error("Attempting to call an unblessed function");
        }

        value = func(nullWriter, value);
      }
      return stringify(value);
    }
  }
}

// Exports
exports.buildTemplate = buildTemplate;

},{"./util":12,"./writers/null":15}],3:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('./util')
  , format = require('./format');

var isArray = util.isArray
  , mixin = util.mixin
  , configure = util.configure
  , bless = util.bless
  , extendContext = util.extendContext
  , freezeObject = util.freezeObject
  , createStaticMixin = util.createStaticMixin
  , stringify = util.stringify
  , buildTemplate = format.buildTemplate;

var CURRENT_VERSION = "0.3.3"
  , TemplateCacheMax = 256
  , globalOptions = { writer: null, errorCallback: null }
  , globalContext = {}
  , globalResolvers = []
  , parser = null;

var slice = Array.prototype.slice;

// Bootstrap ****************************************************************

interpol.VERSION = CURRENT_VERSION;
interpol.options = function options() { return globalOptions; };
interpol.globals = function globals() { return globalContext; };
interpol.resolvers = function resolvers() { return globalResolvers; };
interpol.bless = bless;
interpol.evaluate = evaluate;
interpol.parse = parse;
interpol.compile = compile;

// Core Interpol Implementation *********************************************

function interpol(template, options) {
  var parseOutput = null;
  if ( typeof template === 'object' && template.i == 'interpol' ) {
    if ( !template.n || !template.l ) {
      throw new Error("Syntax elements missing from parse output");
    }
    parseOutput = template;
  }
  else {
    parseOutput = parse(template);
  }
  return compile(parseOutput, options);
}

function evaluate(script, obj, options) {
  var compiled = interpol(script, options);
  return compiled(obj, options);
}

function parse(template) {
  if ( !parser ) {
    if ( typeof interpol.parser !== 'object' ) {
      throw new Error("The Interpol parser was never loaded");
    }
    parser = interpol.parser;
  }
  var result = parser.parse(template);
  result.v = CURRENT_VERSION;
  return result;
}

function compile(parseOutput, localOptions) {
  var createArrayWriter = interpol.createArrayWriter
    , NullWriter = interpol.createNullWriter();

  var Evaluators = freezeObject({
    im: createModuleEvaluator,
    mi: createImportEvaluator,
    de: createPartialEvaluator,
    ca: createCallEvaluator,
    as: createAssignEvaluator,
    op: createOpenTagEvaluator,
    cl: createCloseTagEvaluator,
    ct: createCommentTagEvaluator,
    dt: createDocTypeEvaluator,
    ou: createOutputEvaluator,
    fr: createForEvaluator,
    cn: createConditionalEvaluator,
    or: createOrEvaluator,
    an: createAndEvaluator,
    eq: createEqEvaluator,
    nq: createNeqEvaluator,
    gt: createGtEvaluator,
    lt: createLtEvaluator,
    ge: createGteEvaluator,
    le: createLteEvaluator,
    ad: createAddEvaluator,
    su: createSubEvaluator,
    mu: createMulEvaluator,
    di: createDivEvaluator,
    mo: createModEvaluator,
    fm: createFormatEvaluator,
    no: createNotEvaluator,
    ne: createNegEvaluator,
    mb: createMemberEvaluator,
    tu: createTupleEvaluator,
    id: createIdEvaluator,
    se: createSelfEvaluator
  });

  var lits = parseOutput.l
    , compilerOptions = mixin({}, globalOptions, localOptions)
    , cacheModules = compilerOptions.cache
    , resolvers = compilerOptions.resolvers || globalResolvers
    , evaluator = wrapEvaluator(parseOutput.n)
    , exportedContext = null;

  compiledTemplate.configure = configureTemplate;
  compiledTemplate.exports = templateExports;
  return freezeObject(compiledTemplate);

  function compiledTemplate(obj, localOptions) {
    var ctx = mixin(extendContext(globalContext), obj)
      , processingOptions = mixin({}, globalOptions, localOptions);

    var writer = processingOptions.writer || createArrayWriter();

    try {
      writer.startRender();
      evaluator(ctx, writer);
      return writer.endRender();
    }
    catch ( err ) {
      if ( typeof processingOptions.errorCallback === 'function' ) {
        processingOptions.errorCallback(err, null);
        return;
      }
      // Re-raise if no callback
      throw err;
    }
  }

  function configureTemplate(defaultObj, defaultOptions) {
    return configure(compiledTemplate, 0, slice.call(arguments, 0));
  }

  function templateExports() {
    if ( exportedContext ) {
      return exportedContext;
    }

    exportedContext = extendContext(globalContext);
    exportedContext.__interpolExports = true;
    evaluator(exportedContext, NullWriter);
    delete exportedContext.__interpolExports;

    return exportedContext;
  }
  
  // Evaluator Generation Utilities *****************************************

  function wrapEvaluator(node) {
    var result = createEvaluator(node);
    if ( typeof result === 'function' ) {
      return result;
    }
    return evalWrapper;

    function evalWrapper() {
      return result;
    }
  }

  function wrapArrayEvaluators(arrayNodes) {
    if ( !arrayNodes ) {
      return [];
    }

    var result = [];
    for ( var i = arrayNodes.length - 1; i >= 0; i-- ) {
      result[i] = wrapEvaluator(arrayNodes[i]);
    }
    return result;
  }

  function expandLiterals(literalArray) {
    if ( !literalArray ) {
      return [];
    }

    var result = [];
    for ( var i = literalArray.length - 1; i >= 0; i-- ) {
      result[i] = lits[literalArray[i]];
    }
    return result;
  }

  function wrapAttributeEvaluators(keyValueNodes) {
    if ( !keyValueNodes ) {
      return [];
    }

    var result = [];
    for ( var i = 0, len = keyValueNodes.length; i < len; i++ ) {
      var keyValueNode = keyValueNodes[i];
      result[i] = [createEvaluator(keyValueNode[0]),
                  createEvaluator(keyValueNode[1])];
    }
    return result;
  }

  function wrapAssignmentEvaluators(assignNodes) {
    if ( !assignNodes ) {
      return [];
    }

    var result = [];
    for ( var i = 0, len = assignNodes.length; i < len; i++ ) {
      var assignNode = assignNodes[i];
      result[i] = [lits[assignNode[0]], wrapEvaluator(assignNode[1])];
    }
    return result;
  }

  function createEvaluator(node) {
    if ( !isArray(node) ) {
      if ( typeof node === 'undefined' || node === null ) {
        return null;
      }
      return lits[node];
    }

    var nodeType = lits[node[0]]
      , createFunction = Evaluators[nodeType];

    if ( !createFunction ) {
      throw new Error("Invalid Node in Parse Tree: " + nodeType);
    }

    return createFunction.apply(node, node.slice(1));
  }

  function createStatementsEvaluator(statementNodes) {
    if ( statementNodes.length === 1 ) {
      return createEvaluator(statementNodes[0]);
    }

    var statements = wrapArrayEvaluators(statementNodes).reverse()
      , slen = statements.length - 1;

    return statementsEvaluator;

    function statementsEvaluator(ctx, writer) {
      var result = null;
      for ( var i = slen; i >= 0; i-- ) {
        result = statements[i](ctx, writer);
      }
      return result;
    }
  }

  function getBinaryType(left, right) {
    var l = typeof left === 'function' ? 1 : 0
      , r = typeof right === 'function' ? 2 : 0;
    return l | r;
  }

  // Evaluator Generation ***************************************************

  function createModuleEvaluator(statementNodes) {
    return createStatementsEvaluator(statementNodes);
  }

  function createImportEvaluator(fromNodes) {
    var importList = []
      , ilen = fromNodes.length - 1
      , evaluator = dynamicEvaluator
      , cachedImports = null;

    for ( var i = ilen; i >= 0; i-- ) {
      var fromNode = fromNodes[i]
        , moduleName = lits[fromNode[0]]
        , aliases = fromNode[1]
        , moduleAlias = null
        , toResolve = null;

      if ( isArray(aliases) ) {
        toResolve = [];
        for ( var j = aliases.length - 1; j >= 0; j-- ) {
          var importInfo = aliases[j]
            , name = lits[importInfo[0]]
            , alias = importInfo[1] ? lits[importInfo[1]] : name;
          toResolve.push([alias, name]);
        }
      }
      else if ( typeof aliases === 'number' ) {
        moduleAlias = lits[aliases];
      }
      else {
        moduleAlias = moduleName.split('/').pop();
      }

      importList.push([moduleName, moduleAlias, toResolve]);
    }

    return importEvaluator;

    function importEvaluator(ctx, writer) {
      return evaluator(ctx, writer);
    }

    function cachedEvaluator(ctx, writer) {
      cachedImports(ctx);
    }

    function dynamicEvaluator(ctx, writer) {
      var generateCache = cacheModules && !ctx.__interpolExports
        , target = generateCache ? {} : ctx;

      for ( var i = ilen; i >= 0; i-- ) {
        var importItem = importList[i]
          , moduleName = importItem[0]
          , moduleAlias = importItem[1]
          , toResolve = importItem[2];

        var moduleExports = resolveExports(moduleName, true);

        if ( toResolve ) {
          for ( var j = toResolve.length - 1; j >= 0; j-- ) {
            var aliasMap = toResolve[j];
            target[aliasMap[0]] = moduleExports[aliasMap[1]];
          }
        }
        else {
          target[moduleAlias] = moduleExports;
        }
      }

      if ( generateCache ) {
        evaluator = cachedEvaluator;
        cachedImports = createStaticMixin(target);
        cachedImports(ctx);
      }
    }

    function resolveExports(moduleName, raiseError) {
      var module = null;
      for ( var i = resolvers.length - 1; i >= 0; i-- ) {
        module = resolvers[i].resolveExports(moduleName, compilerOptions);
        if ( module ) {
          break;
        }
      }
      if ( !module && raiseError ) {
        throw new Error("Module '" + moduleName +"' not resolved");
      }
      return module;
    }
  }

  function createPartialEvaluator(nameLiteral, paramDefs, statementNodes) {
    var name = lits[nameLiteral]
      , params = [null].concat(expandLiterals(paramDefs))
      , plen = params.length
      , statements = createStatementsEvaluator(statementNodes);

    return closureEvaluator;

    function closureEvaluator(ctx /*, writer */) {
      bodyEvaluator.__interpolFunction = true;
      ctx[name] = bodyEvaluator;

      function bodyEvaluator(writer) {
        var newCtx = extendContext(ctx);
        newCtx[name] = bodyEvaluator;
        for ( var i = 1; i < plen; i++ ) {
          newCtx[params[i]] = arguments[i];
        }
        return statements(newCtx, writer);
      }
    }
  }

  function createCallEvaluator(memberNode, argNodes) {
    var member = createEvaluator(memberNode)
      , args = [null].concat(wrapArrayEvaluators(argNodes))
      , alen = args.length;

    return callEvaluator;

    function callEvaluator(ctx, writer) {
      var func = member(ctx, writer);

      if ( typeof func !== 'function' || !func.__interpolFunction ) {
        if ( ctx.__interpolExports ) {
          return;
        }
        throw new Error("Attempting to call an unblessed function");
      }

      var callArgs = [writer];
      for ( var i = 1; i < alen; i++ ) {
        callArgs[i] = args[i](ctx, writer);
      }

      return func.apply(null, callArgs);
    }
  }

  function createAssignEvaluator(assignmentDefs) {
    var assigns = wrapAssignmentEvaluators(assignmentDefs).reverse()
      , alen = assigns.length - 1;

    return assignEvaluator;

    function assignEvaluator(ctx, writer) {
      for ( var i = alen; i >= 0; i-- ) {
        var assign = assigns[i];
        ctx[assign[0]] = assign[1](ctx, writer);
      }
    }
  }

  function createOpenTagEvaluator(nameNode, attributeDefs, selfClose) {
    var name = createEvaluator(nameNode)
      , attributes = wrapAttributeEvaluators(attributeDefs).reverse()
      , alen = attributes.length - 1;

    if ( typeof name === 'function' ) {
      return selfClose ? selfCloseFuncEvaluator : openTagFuncEvaluator;
    }
    return selfClose ? selfCloseLiteralEvaluator : openTagLiteralEvaluator;

    function selfCloseFuncEvaluator(ctx, writer) {
      var tagName = stringify(name(ctx, writer));
      writer.selfCloseElement(tagName, getAttributes(ctx, writer));
    }

    function openTagFuncEvaluator(ctx, writer) {
      var tagName = stringify(name(ctx, writer));
      writer.startElement(tagName, getAttributes(ctx, writer));
    }

    function selfCloseLiteralEvaluator(ctx, writer) {
      writer.selfCloseElement(name, getAttributes(ctx, writer));
    }

    function openTagLiteralEvaluator(ctx, writer) {
      writer.startElement(name, getAttributes(ctx, writer));
    }

    function getAttributes(ctx, writer) {
      var result = {};
      for ( var i = alen; i >= 0; i-- ) {
        var attribute = attributes[i]
          , key = attribute[0];

        if ( typeof key === 'function' ) {
          key = key(ctx, writer);
          if ( typeof key === 'undefined' || key === null ) {
            continue;
          }
          key = stringify(key);
        }

        var val = attribute[1];
        if ( typeof val === 'function' ) {
          val = val(ctx, writer);
        }
        result[key] = stringify(val);
      }
      return freezeObject(result);
    }
  }

  function createCloseTagEvaluator(nameNode) {
    var name = createEvaluator(nameNode)
      , name_func = typeof name === 'function';

    return name_func ? closeFuncEvaluator : closeLiteralEvaluator;

    function closeFuncEvaluator(ctx, writer) {
      writer.endElement(stringify(name(ctx, writer)));
    }

    function closeLiteralEvaluator(ctx, writer) {
      writer.endElement(name);
    }
  }

  function createCommentTagEvaluator(contentLiteral) {
    var content = lits[contentLiteral];

    return commentTagEvaluator;

    function commentTagEvaluator(ctx, writer) {
      writer.comment(content);
    }
  }

  function createDocTypeEvaluator(rootElemLiteral) {
    var rootElem = lits[rootElemLiteral];

    return docTypeEvaluator;

    function docTypeEvaluator(ctx, writer) {
      writer.docType(rootElem);
    }
  }

  function createOutputEvaluator(exprNode) {
    var $1 = createEvaluator(exprNode);

    if ( typeof $1 !== 'function' ) {
      $1 = stringify($1);
      return outputLiteral;
    }
    return outputEvaluator;

    function outputEvaluator(ctx, writer) {
      writer.content(stringify($1(ctx, writer)));
    }

    function outputLiteral(ctx, writer) {
      writer.content($1);
    }
  }

  function createForEvaluator(rangeNodes, statementNodes) {
    var ranges = wrapAssignmentEvaluators(rangeNodes).reverse()
      , rlen = ranges.length
      , statements = createStatementsEvaluator(statementNodes);

    return forEvaluator;

    function forEvaluator(ctx, writer) {
      var newCtx = extendContext(ctx);
      processRange(rlen - 1);

      function processRange(idx) {
        var range = ranges[idx]
          , name = range[0]
          , collection = range[1](newCtx, writer);

        if ( !isArray(collection) ) {
          return;
        }

        for ( var i = 0, len = collection.length; i < len; i++ ) {
          newCtx[name] = collection[i];
          if ( idx ) {
            processRange(idx - 1);
          }
          else {
            statements(newCtx, writer);
          }
        }
      }
    }
  }

  function createConditionalEvaluator(conditionNode, trueNodes, falseNodes) {
    var $1 = createEvaluator(conditionNode)
      , $2 = createStatementsEvaluator(trueNodes)
      , $3 = createStatementsEvaluator(falseNodes);

    if ( typeof $1 !== 'function' ) {
      return $1 ? $2 : $3;
    }

    var type = getBinaryType($2, $3);
    return [condLiteral, condTrue, condFalse, condBoth][type];

    function condLiteral(c, w) { return $1(c, w) ? $2 : $3; }
    function condTrue(c, w) { return $1(c, w) ? $2(c, w) : $3; }
    function condFalse(c, w) { return $1(c, w) ? $2 : $3(c, w); }
    function condBoth(c, w) { return $1(c, w) ? $2(c, w) : $3(c, w); }
  }

  function createOrEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode);

    if ( typeof $1 !== 'function' ) {
      return $1 || $2;
    }

    return typeof $2 === 'function' ? orFuncEvaluator : orLiteralEvaluator;

    function orFuncEvaluator(ctx, writer) {
      var lval = $1(ctx, writer);
      return lval ? lval : $2(ctx, writer);
    }

    function orLiteralEvaluator(ctx, writer) {
      var lval = $1(ctx, writer);
      return lval ? lval : $2;
    }
  }

  function createAndEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode);

    if ( typeof $1 !== 'function' ) {
      return $1 && $2;
    }

    return typeof $2 === 'function' ? andFuncEvaluator : andLiteralEvaluator;

    function andFuncEvaluator(ctx, writer) {
      var lval = $1(ctx, writer);
      return lval ? $2(ctx, writer) : lval;
    }

    function andLiteralEvaluator(ctx, writer) {
      var lval = $1(ctx, writer);
      return lval ? $2 : lval;
    }
  }

  function createEqEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

     return [null, eqLeft, eqRight, eqBoth][type] || ($1 == $2);

    function eqLeft(c, w) { return $1(c, w) == $2; }
    function eqRight(c, w) { return $1 == $2(c, w); }
    function eqBoth(c, w) { return $1(c, w) == $2(c, w); }
  }

  function createNeqEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, neqLeft, neqRight, neqBoth][type] || ($1 != $2);

    function neqLeft(c, w) { return $1(c, w) != $2; }
    function neqRight(c, w) { return $1 != $2(c, w); }
    function neqBoth(c, w) { return $1(c, w) != $2(c, w); }
  }

  function createGtEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, gtLeft, gtRight, gtBoth][type] || ($1 > $2);

    function gtLeft(c, w) { return $1(c, w) > $2; }
    function gtRight(c, w) { return $1 > $2(c, w); }
    function gtBoth(c, w) { return $1(c, w) > $2(c, w); }
  }

  function createGteEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, gteLeft, gteRight, gteBoth][type] || ($1 >= $2);

    function gteLeft(c, w) { return $1(c, w) >= $2; }
    function gteRight(c, w) { return $1 >= $2(c, w); }
    function gteBoth(c, w) { return $1(c, w) >= $2(c, w); }
  }

  function createLtEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, ltLeft, ltRight, ltBoth][type] || ($1 < $2);

    function ltLeft(c, w) { return $1(c, w) < $2; }
    function ltRight(c, w) { return $1 < $2(c, w); }
    function ltBoth(c, w) { return $1(c, w) < $2(c, w); }
  }

  function createLteEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, lteLeft, lteRight, lteBoth][type] || ($1 <= $2);

    function lteLeft(c, w) { return $1(c, w) <= $2; }
    function lteRight(c, w) { return $1 <= $2(c, w); }
    function lteBoth(c, w) { return $1(c, w) <= $2(c, w); }
  }

  function createAddEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, addLeft, addRight, addBoth][type] || ($1 + $2);

    function addLeft(c, w) { return $1(c, w) + $2; }
    function addRight(c, w) { return $1 + $2(c, w); }
    function addBoth(c, w) { return $1(c, w) + $2(c, w); }
  }

  function createSubEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, subLeft, subRight, subBoth][type] || ($1 - $2);

    function subLeft(c, w) { return $1(c, w) - $2; }
    function subRight(c, w) { return $1 - $2(c, w); }
    function subBoth(c, w) { return $1(c, w) - $2(c, w); }
  }

  function createMulEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, mulLeft, mulRight, mulBoth][type] || ($1 * $2);

    function mulLeft(c, w) { return $1(c, w) * $2; }
    function mulRight(c, w) { return $1 * $2(c, w); }
    function mulBoth(c, w) { return $1(c, w) * $2(c, w); }
  }

  function createDivEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, divLeft, divRight, divBoth][type] || ($1 / $2);

    function divLeft(c, w) { return $1(c, w) / $2; }
    function divRight(c, w) { return $1 / $2(c, w); }
    function divBoth(c, w) { return $1(c, w) / $2(c, w); }
  }

  function createModEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, modLeft, modRight, modBoth][type] || ($1 % $2);

    function modLeft(c, w) { return $1(c, w) % $2; }
    function modRight(c, w) { return $1 % $2(c, w); }
    function modBoth(c, w) { return $1(c, w) % $2(c, w); }
  }
  
  function createFormatEvaluator(formatNode, exprNode) {
    var $1 = createEvaluator(formatNode)
      , $1_func = typeof $1 === 'function'
      , $2 = createEvaluator(exprNode)
      , $2_func = typeof $2 === 'function';

    var template = null;
    if ( !$1_func ) {
      template = buildTemplate($1);
      if ( $2_func ) {
        return builtExpressionEvaluator;
      }
      if ( template.__requiresContext ) {
        return builtLiteralEvaluator;
      }
      return template($2);
    }

    var cache = {}
      , cacheCount = 0;

    return dynamicFormatEvaluator;

    function builtExpressionEvaluator(ctx, writer) {
      return template($2(ctx, writer), ctx);
    }

    function builtLiteralEvaluator(ctx, writer) {
      return template($2, ctx);
    }

    function dynamicFormatEvaluator(ctx, writer) {
      var formatStr = $1(ctx, writer)
        , data = $2_func ? $2(ctx, writer) : $2
        , dynamicTemplate = cache[formatStr];

      if ( !dynamicTemplate ) {
        if ( cacheCount >= TemplateCacheMax ) {
          // Something is clearly wrong here and we're not using this for
          // localized strings.  If we keep caching, we're going to start
          // leaking memory.  So blow away the cache and start over
          cache = {};
          cacheCount = 0;
        }
        dynamicTemplate = buildTemplate(formatStr);
        cache[formatStr] = dynamicTemplate;
        cacheCount++;
      }

      return dynamicTemplate(data, ctx);
    }
  }

  function createNotEvaluator(node) {
    var $1 = createEvaluator(node);
    return typeof $1 === 'function' ? notEvaluator : !$1;

    function notEvaluator(ctx, writer) {
      return !$1(ctx, writer);
    }
  }

  function createNegEvaluator(node) {
    var $1 = createEvaluator(node);
    return typeof $1 === 'function' ? negEvaluator : -$1;

    function negEvaluator(ctx, writer) {
      return -$1(ctx, writer);
    }
  }

  function createMemberEvaluator(parentNode, elemNode) {
    var $1 = createEvaluator(parentNode)
      , $2 = createEvaluator(elemNode)
      , type = getBinaryType($1, $2);

    if ( ( type === 0 || type === 2 ) &&
         ( typeof $1 === 'undefined' || $1 === null ) ) {
      return null;
    }

    return [null, memLeft, memRight, memBoth][type] || ($1[$2]);

    function memLeft(c, w) {
      var parent = $1(c, w);
      if ( typeof parent === 'undefined' || parent === null ) {
        return null;
      }
      return parent[$2];
    }

    function memRight(c, w) {
      return $1[$2(c, w)];
    }

    function memBoth(c, w) {
      var parent = $1(c, w);
      if ( typeof parent === 'undefined' || parent === null ) {
        return null;
      }
      return parent[$2(c, w)];
    }
  }

  function createTupleEvaluator(elemNodes) {
    var elems = wrapArrayEvaluators(elemNodes)
      , elen = elems.length;

    return tupleEvaluator;

    function tupleEvaluator(ctx, writer) {
      var result = [];
      for ( var i = 0; i < elen; i++ ) {
        result[i] = elems[i](ctx, writer);
      }
      return result;
    }
  }

  function createIdEvaluator(nameLiteral) {
    var name = lits[nameLiteral];
    return idEvaluator;

    function idEvaluator(ctx, writer) {
      return ctx[name];
    }
  }

  function createSelfEvaluator() {
    return selfEvaluator;

    function selfEvaluator(ctx, writer) {
      return ctx;
    }
  }
}

// Exports
module.exports = interpol;

},{"./format":2,"./util":12}],4:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

function createModuleCache() {
  var cache = {};

  return {
    exists: exists,
    getModule: getModule,
    getExports: getExports,
    putModule: putModule,
    removeModule: removeModule
  };

  function exists(name) {
    return cache[name];
  }

  function getModule(name) {
    var result = cache[name];
    return result ? result.module : null;
  }

  function getExports(name) {
    var result = cache[name];
    if ( !result ) {
      return null;
    }

    if ( !result.dirtyExports ) {
      return result.moduleExports;
    }

    var moduleExports = result.moduleExports
      , key = null;

    if ( !moduleExports ) {
      moduleExports = result.moduleExports = {};
    }
    else {
      // This logic is necessary because another module may already be
      // caching this result as a dependency.
      for ( key in moduleExports ) {
        if ( moduleExports.hasOwnProperty(key) ) {
          delete moduleExports[key];
        }
      }
    }

    var exported = result.module.exports();
    for ( key in exported ) {
      if ( exported.hasOwnProperty(key) ) {
        moduleExports[key] = exported[key];
      }
    }

    result.dirtyExports = false;
    return moduleExports;
  }

  function putModule(name, module) {
    var cached = cache[name];
    if ( cached ) {
      cached.module = module;
      cached.dirtyExports = true;
    }
    else {
      cached = cache[name] = { module: module, dirtyExports: true };
    }
    return cached.module;
  }

  function removeModule(name) {
    delete cache[name];
  }
}

// Exports
exports.createModuleCache = createModuleCache;

},{}],5:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util');

var bless = util.bless;

// Implementation ***********************************************************

function createHelperResolver(options) {
  options = options || {};

  var moduleName = options.name || 'helpers'
    , moduleExports = {};

  return {
    resolveModule: resolveModule,
    resolveExports: resolveExports,
    registerHelper: registerHelper,
    unregisterHelper: unregisterHelper
  };

  function resolveModule(name) {
    return null;
  }

  function resolveExports(name) {
    return name === moduleName ? moduleExports : null;
  }

  function registerHelper(name, func) {
    if ( typeof name === 'function' ) {
      func = name;
      if ( !func.name ) {
        throw new Error("Function requires a name");
      }
      name = func.name;
    }
    moduleExports[name] = bless(func);
  }

  function unregisterHelper(name) {
    if ( typeof name === 'function' ) {
      name = name.name;
    }
    if ( name ) {
      delete moduleExports[name];
    }
  }
}

// Add Default Helper Resolver
var helperResolver = createHelperResolver();
interpol.helperResolver = helperResolver;
interpol.resolvers().push(helperResolver);

// Exports
interpol.createHelperResolver = createHelperResolver;
exports.createHelperResolver = createHelperResolver;

},{"../interpol":3,"../util":12}],6:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , modules = require('../modules');

// Implementation ***********************************************************

function createMemoryResolver(options) {
  var cache = modules.createModuleCache();

  return {
    resolveModule: cache.getModule,
    resolveExports: cache.getExports,
    unregisterModule: cache.removeModule,
    registerModule: registerModule
  };

  function registerModule(name, module) {
    if ( typeof module === 'function' &&
         typeof module.exports === 'function' ) {
      cache.putModule(name, module);
      return;
    }

    if ( typeof module === 'string' ||
         typeof module.length === 'number' ) {
      cache.putModule(name, interpol(module));
      return;
    }

    throw new Error("Module not provided");
  }
}

// Add Default Memory Resolver
var memoryResolver = createMemoryResolver();
interpol.memoryResolver = memoryResolver;
interpol.resolvers().push(memoryResolver);

// Exports
exports.createMemoryResolver = createMemoryResolver;
interpol.createMemoryResolver = createMemoryResolver;

},{"../interpol":3,"../modules":4}],7:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../../util')
  , isArray = util.isArray;
  
function first(writer, value) {
  if ( !isArray(value) ) {
    return value;
  }
  return value[0];
}

function join(writer, value, delim) {
  if ( isArray(value) ) {
    return value.join(delim || ' ');
  }
  return value;
}

function last(writer, value) {
  if ( !isArray(value) ) {
    return value;
  }
  if ( value.length ) return value[value.length - 1];
  return null;
}

function length(writer, value) {
  return isArray(value) ? value.length : 0;
}

function empty(writer, value) {
  return !value || !value.length;
}

// Exports
exports.first = first;
exports.join = join;
exports.last = last;
exports.length = length;
exports.empty = empty;

},{"../../util":12}],8:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../../interpol')
  , util = require('../../util')
  , wrap = require('./wrap');

var freezeObject = util.freezeObject
  , bless = util.bless
  , configurable = wrap.configurable;

// Implementation ***********************************************************

function createSystemResolver() {
  var modules = buildModules();

  return {
    resolveModule: resolveModule,
    resolveExports: resolveExports
  };

  function resolveModule(name) {
    return null;
  }
  
  function resolveExports(name) {
    return modules[name];
  }
}

function buildModules() {
  return freezeObject({
    math: blessModule(require('./math')),
    array: blessModule(require('./array')),
    string: blessModule(require('./string'))
  });
}

function blessModule(module) {
  var result = {};
  for ( var key in module ) {
    var value = module[key];
    if ( typeof value === 'function') {
      result[key] = configurable(bless(value));
    }
    else {
      result[key] = value;
    }
  }
  return result;
}

// Add Default System Resolver
var systemResolver = createSystemResolver();
interpol.systemResolver = systemResolver;
interpol.resolvers().push(systemResolver);

// Exports
exports.createSystemResolver = createSystemResolver;
interpol.createSystemResolver = createSystemResolver;

},{"../../interpol":3,"../../util":12,"./array":7,"./math":9,"./string":10,"./wrap":11}],9:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../../util')
  , isArray = util.isArray;

var wrap = require('./wrap').wrap;

function avg(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  if ( value.length === 0 ) return 0;
  for ( var i = 0, r = 0, l = value.length; i < l; r += value[i++] );
  return r / l;
}

function max(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  return Math.max.apply(Math, value);
}

function median(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  if ( value.length === 0 ) return 0;
  var temp = value.slice(0).order();
  if ( temp.length % 2 === 0 ) {
    var mid = temp.length / 2;
    return (temp[mid - 1] + temp[mid]) / 2;
  }
  return temp[(temp.length + 1) / 2];
}

function min(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  return Math.min.apply(Math, value);
}

function sum(writer, value) {
  if ( !isArray(value) ) {
    return typeof value === 'number' ? value : NaN;
  }
  for ( var i = 0, res = 0, l = value.length; i < l; res += value[i++] );
  return res;
}

// Exports
exports.avg = avg;
exports.max = max;
exports.median = median;
exports.min = min;
exports.sum = sum;

// Math functions
exports.number = wrap(Number);
exports.abs = wrap(Math.abs);
exports.acos = wrap(Math.acos);
exports.asin = wrap(Math.asin);
exports.atan = wrap(Math.atan);
exports.atan2 = wrap(Math.atan2);
exports.ceil = wrap(Math.ceil);
exports.cos = wrap(Math.cos);
exports.exp = wrap(Math.exp);
exports.floor = wrap(Math.floor);
exports.log = wrap(Math.log);
exports.pow = wrap(Math.pow);
exports.random = wrap(Math.random);
exports.round = wrap(Math.round);
exports.sin = wrap(Math.sin);
exports.sqrt = wrap(Math.sqrt);
exports.tan = wrap(Math.tan);

// Constants
exports.E = Math.E;
exports.LN2 = Math.LN2;
exports.LN10 = Math.LN10;
exports.LOG2E = Math.LOG2E;
exports.LOG10E = Math.LOG10E;
exports.PI = Math.PI;
exports.SQRT1_2 = Math.SQRT1_2;
exports.SQRT2 = Math.SQRT2;

},{"../../util":12,"./wrap":11}],10:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../../util')
  , stringify = util.stringify;

var wrap = require('./wrap').wrap;

function lower(writer, value) {
  return stringify(value).toLowerCase();
}

function split(writer, value, delim, idx) {
  var val = stringify(value).split(delim || ' \n\r\t');
  return typeof idx !== 'undefined' ? val[idx] : val;
}

function title(writer, value) {
  return stringify(value).replace(/\w\S*/g, function (word) {
    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
  });
}

function upper(writer, value) {
  return stringify(value).toUpperCase();
}

// Exports
exports.lower = lower;
exports.split = split;
exports.title = title;
exports.upper = upper;

exports.string = wrap(String);

},{"../../util":12,"./wrap":11}],11:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../../util');

var slice = Array.prototype.slice
  , bless = util.bless
  , configure = util.configure;

function wrap(func) {
  return bless(wrappedFunction);

  function wrappedFunction(writer) {
    /* jshint validthis:true */
    return func.apply(this, slice.call(arguments, 1));
  }
}

function configurable(func) {
  blessedConfigure.__interpolFunction = true;
  func.configure = blessedConfigure;
  return func;

  function blessedConfigure(writer) {
    // writer, value are always passed to configurables, hence the '2'
    var configured = configure(func, 2, slice.call(arguments, 1));
    configured.__interpolFunction = true;
    return configured;
  }
}

// Exports
exports.wrap = wrap;
exports.configurable = configurable;

},{"../../util":12}],12:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

// Array and Object Handling **************************************************

var toString = Object.prototype.toString
  , slice = Array.prototype.slice;

var isArray = Array.isArray;
if ( !isArray ) {
  isArray = (function () {
    return function _isArray(obj) {
      return obj && obj.length && toString.call(obj) === '[object Array]';
    };
  })();
}

function mixin(target) {
  for ( var i = 1, len = arguments.length; i < len; i++ ) {
    var src = arguments[i];
    if ( !src ) {
      continue;
    }
    for ( var key in src ) {
      if ( !src.hasOwnProperty(key) ) {
        continue;
      }
      target[key] = src[key];
    }
  }
  return target;
}

var extendContext = Object.create;
if ( !extendContext ) {
  extendContext = (function () {
    function FakeConstructor() {}

    return function _extendContext(obj) {
      FakeConstructor.prototype = obj;
      return new FakeConstructor();
    };
  })();
}

var freezeObject = Object.freeze;
if ( !freezeObject ) {
  freezeObject = (function () {
    return function _freezeObject(obj) {
      return obj;
    };
  })();
}

var objectKeys = Object.keys;
if ( !objectKeys ) {
  objectKeys = (function () {
    return function _objectKeys(obj) {
      var keys = [];
      for ( var key in obj ) {
        if ( obj.hasOwnProperty(key) ) {
          keys.push(key);
        }
      }
      return keys;
    };
  });
}

function createStaticMixin(obj) {
  var keys = objectKeys(freezeObject(obj)).reverse()
    , klen = keys.length - 1;

  return staticMixin;

  function staticMixin(target) {
    for ( var i = klen; i >= 0; i-- ) {
      var key = keys[i];
      target[key] = obj[key];
    }
    return target;
  }
}

// String Handling ************************************************************

var EscapeChars = freezeObject({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
});

function escapeAttribute(str) {
  return str.replace(/[&<>'"]/gm, function(ch) {
    return EscapeChars[ch];
  });
}

function escapeContent(str) {
  return str.replace(/[&<>]/gm, function(ch) {
    return EscapeChars[ch];
  });
}

// TODO: Need to better handle complex types like Dates
function stringify(obj) {
  var type = typeof obj;
  switch ( type ) {
    case 'string':
      return obj;

    case 'number':
      return obj.toString();

    case 'boolean':
      return obj ? 'true' : 'false';

    case 'xml':
      return obj.toXMLString();

    case 'object':
      if ( isArray(obj) ) {
        var result = [];
        for ( var i = 0, len = obj.length; i < len; i++ ) {
          result[i] = stringify(obj[i]);
        }
        return result.join(' ');
      }
      return obj !== null ? obj.toString() : '';

    default:
      // catches 'undefined'
      return '';
  }
}

// Exceptions *****************************************************************

function formatSyntaxError(err, filePath) {
  if ( !err.name || err.name !== 'SyntaxError') {
    return err;
  }

  var unexpected = err.found ? "'" + err.found + "'" : "end of file"
    , errString = "Unexpected " + unexpected
    , lineInfo = ":" + err.line + ":" + err.column;

  return new Error((filePath || 'string') + lineInfo + ": " + errString);
}

// Function Invocation ********************************************************

function bless(func) {
  if ( typeof func !== 'function' ) {
    throw new Error("Argument to bless must be a Function");
  }

  if ( func.__interpolFunction ) {
    return func;
  }

  blessedWrapper.__interpolFunction = true;
  return blessedWrapper;

  function blessedWrapper() {
    /* jshint validthis:true */
    return func.apply(this, arguments);
  }
}

function configure(func, requiredCount, defaultArgs) {
  var required = [];
  required.length = requiredCount;
  var argTemplate = required.concat(defaultArgs);
  return configuredWrapper;

  function configuredWrapper() {
    /* jshint validthis:true */
    var args = slice.call(arguments, 0)
      , applyArgs = args.concat(argTemplate.slice(args.length));
    return func.apply(this, applyArgs);
  }
}

// Exports
exports.isArray = isArray;
exports.mixin = mixin;
exports.extendContext = extendContext;
exports.freezeObject = freezeObject;
exports.objectKeys = objectKeys;
exports.createStaticMixin = createStaticMixin;
exports.escapeAttribute = escapeAttribute;
exports.escapeContent = escapeContent;
exports.stringify = stringify;
exports.formatSyntaxError = formatSyntaxError;
exports.bless = bless;
exports.configure = configure;

},{}],13:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util');

var freezeObject = util.freezeObject
  , escapeAttribute = util.escapeAttribute
  , escapeContent = util.escapeContent;

function noOp() {}

function createArrayWriter(arr) {
  arr = arr || [];

  return freezeObject({
    startRender: noOp,
    endRender: endRender,
    startElement: startElement,
    selfCloseElement: selfCloseElement,
    endElement: endElement,
    comment: comment,
    docType: docType,
    content: content,
    rawContent: rawContent
  });

  function endRender() {
    return arr.join('');
  }

  function writeAttributes(attributes) {
    for ( var key in attributes ) {
      arr.push(" ", key, "=\"", escapeAttribute(attributes[key]), "\"");
    }
  }

  function startElement(tagName, attributes) {
    arr.push("<", tagName);
    writeAttributes(attributes);
    arr.push(">");
  }

  function selfCloseElement(tagName, attributes) {
    arr.push("<", tagName);
    writeAttributes(attributes);
    arr.push(" />");
  }

  function endElement(tagName) {
    arr.push("</", tagName, ">");
  }

  function comment(content) {
    arr.push("<!--", content, "-->");
  }

  function docType(rootElement) {
    arr.push("<!DOCTYPE ", rootElement, ">");
  }

  function content() {
    for ( var i = 0, len = arguments.length; i < len; i++ ) {
      arr.push(escapeContent(arguments[i]));
    }
  }

  function rawContent() {
    arr.push.apply(arr, arguments);
  }
}

// Exports
exports.createArrayWriter = createArrayWriter;
interpol.createArrayWriter = createArrayWriter;

},{"../interpol":3,"../util":12}],14:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util')
  , array = require('./array');

var freezeObject = util.freezeObject
  , mixin = util.mixin
  , createArrayWriter = array.createArrayWriter;

var REPLACE = createDOMWriter.REPLACE = 'replace'
  , APPEND = createDOMWriter.APPEND = 'append'
  , INSERT = createDOMWriter.INSERT = 'insert';

function createDOMWriter(parentElement, renderMode) {
  var arr = []
    , writer = createArrayWriter(arr)
    , endRender;

  switch ( renderMode ) {
    case APPEND:  endRender = appendEndRender; break;
    case INSERT:  endRender = insertEndRender; break;
    case REPLACE: endRender = replaceEndRender; break;
    default:      endRender = replaceEndRender;
  }

  return freezeObject(mixin({}, writer, {
    startRender: startRender,
    endRender: endRender
  }));

  function startRender() {
    // Just in case
    arr.length = 0;
  }

  function appendEndRender() {
    var container = document.createElement("span");
    container.innerHTML = arr.join('');
    arr.length = 0;
    parentElement.appendChild(container);
  }

  function insertEndRender() {
    var container = document.createElement("span");
    container.innerHTML = arr.join('');
    arr.length = 0;
    parentElement.insertBefore(container, parentElement.firstChild);
  }

  function replaceEndRender() {
    parentElement.innerHTML = arr.join('');
    arr.length = 0;
  }
}

// Exports
exports.createDOMWriter = createDOMWriter;
interpol.createDOMWriter = createDOMWriter;

},{"../interpol":3,"../util":12,"./array":13}],15:[function(require,module,exports){
/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var interpol = require('../interpol')
  , util = require('../util');

var freezeObject = util.freezeObject;

function noOp() {}

function createNullWriter() {
  return freezeObject({
    startRender: noOp,
    endRender: noOp,
    startElement: noOp,
    selfCloseElement: noOp,
    endElement: noOp,
    comment: noOp,
    docType: noOp,
    content: noOp,
    rawContent: noOp
  });
}

// Exports
exports.createNullWriter = createNullWriter;
interpol.createNullWriter = createNullWriter;

},{"../interpol":3,"../util":12}]},{},[1])
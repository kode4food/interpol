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
      , evaluator = dynamicEvaluator;

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
        evaluator = createStaticMixin(target);
        evaluator(ctx);
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

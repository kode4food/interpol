/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var util = require('./util');
var format = require('./format');
var match = require('./match');

var createStringWriter = require('./writers/string').createStringWriter;
var nullWriter = require('./writers/null').createNullWriter();

var isArray = util.isArray;
var mixin = util.mixin;
var configure = util.configure;
var extendObject = util.extendObject;
var objectKeys = util.objectKeys;
var isInterpolFunction = util.isInterpolFunction;
var createStaticMixin = util.createStaticMixin;
var buildTemplate = format.buildTemplate;
var isMatchingObject = match.isMatchingObject;
var buildMatcher = match.buildMatcher;

var TemplateCacheMax = 256;

var slice = Array.prototype.slice;

var globalOptions = { writer: null, errorCallback: null };
var globalContext = {};
var globalResolvers = [];

function noOp() {}

function buildRuntime(localOptions) {
  var runtimeOptions = mixin({}, globalOptions, localOptions);
  var cacheModules = runtimeOptions.cache;
  var resolvers = runtimeOptions.resolvers || globalResolvers;
  var evaluator = wrapLiteral(createStatementsEvaluator(parseOutput.n));
  var exportedContext = null;

  runtimeTemplate.configure = configureTemplate;
  runtimeTemplate.exports = templateExports;
  return runtimeTemplate;

  /**
   * The result of a runtime processing is this closure.  `obj` is the
   * Object to be used as a working context, while `localOptions` are
   * options to be applied to a particular rendering.  If no `errorCallback`
   * is provided, calls to this function may throw errors.
   *
   * @param {Object} obj the context Object to be rendered
   * @param {Object} [localOptions] Object for configuring the current render
   * @param {Writer} [localOptions.writer] an alternative Writer to use
   * @param {Function} [localOptions.errorCallback] a callback for errors
   */

  function runtimeTemplate(obj, localOptions) {
    var ctx = mixin(extendObject(globalContext), obj);
    var processingOptions = mixin({}, globalOptions, localOptions);

    // If no Writer is provided, create a throw-away Array Writer
    var writer = processingOptions.writer || createStringWriter();

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

  /**
   * Returns a preconfigured version of the runtime template with a
   * default obj and options.  Convenient if you're doing DOM writing
   * or need to repeatedly call the template with the same Object.
   *
   * @param {Object} defaultObj default context Object to use
   * @param {Object} defaultOptions default Options to provide
   */

  function configureTemplate(defaultObj, defaultOptions) {
    return configure(runtimeTemplate, 0, slice.call(arguments, 0));
  }

  /**
   * Returns the symbols (partials and assignments) that the runtime
   * template will product against an empty `{}` context Object.  This is
   * the method by which Interpol imports work.  Partials produced with
   * this method still have access to the global context.
   */

  function templateExports() {
    /* istanbul ignore if */
    if ( exportedContext ) {
      return exportedContext;
    }

    // `__intExports` is an indicator to evaluators that we're processing
    // exports and so they can be a bit lax about reporting errors or
    // resolving imports

    exportedContext = extendObject(globalContext);
    exportedContext.__intExports = true;
    evaluator(exportedContext, nullWriter);
    delete exportedContext.__intExports;

    return exportedContext;
  }

  // generate an evaluator to deal with 'from' and 'import' statements
  function createImportEvaluator(fromNodes) {
    var importList = [];
    var ilen = fromNodes.length - 1;
    var evaluator = cacheModules ? cacheableEvaluator : dynamicEvaluator;

    for ( var i = ilen; i >= 0; i-- ) {
      var fromNode = fromNodes[i];
      var moduleName = lits[fromNode[0]];
      var aliases = fromNode[1];
      var moduleAlias = null;
      var toResolve = null;

      if ( isArray(aliases) ) {
        toResolve = [];
        for ( var j = aliases.length - 1; j >= 0; j-- ) {
          var importInfo = aliases[j];
          var name = lits[importInfo[0]];
          var alias = importInfo[1] ? lits[importInfo[1]] : name;
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
      // have to call it like this because we can't override importEvaluator
      // after it has been returned to a parent evaluator
      evaluator(ctx, writer);
    }

    // if moduleCaching is on, we use the cachable form of the evaluator
    function cacheableEvaluator(ctx, writer) {
      if ( ctx.__intExports ) {
        dynamicEvaluator(ctx, writer);
        return;
      }

      var target = {};
      dynamicEvaluator(target, writer);
      evaluator = createStaticMixin(target);
      evaluator(ctx);
    }

    // if moduleCaching is off, we resolve the exports every time
    function dynamicEvaluator(ctx, writer) {
      for ( var i = ilen; i >= 0; i-- ) {
        var importItem = importList[i];
        var moduleName = importItem[0];
        var moduleAlias = importItem[1];
        var toResolve = importItem[2];

        var moduleExports = resolveExports(moduleName, true);

        if ( toResolve ) {
          for ( var j = toResolve.length - 1; j >= 0; j-- ) {
            var aliasMap = toResolve[j];
            ctx[aliasMap[0]] = moduleExports[aliasMap[1]];
          }
        }
        else {
          ctx[moduleAlias] = moduleExports;
        }
      }
    }

    // where exports are actually resolved. raiseError will be false
    // if we're in the process of evaluating a template for the purpose
    // of yielding its exports
    function resolveExports(moduleName, raiseError) {
      var module = null;
      for ( var i = resolvers.length - 1; i >= 0; i-- ) {
        module = resolvers[i].resolveExports(moduleName, runtimeOptions);
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

  function isInterpolPartial(func) {
    return typeof func === 'function' && func.__intFunction === 'part';
  }

  // generate an evaluator to represent a partial and its associated closure
  function createPartialEvaluator(nameLiteral, paramDefs,
                                  statementNodes, guardNode) {
    var name = lits[nameLiteral];
    var params = [null].concat(expandLiterals(paramDefs));
    var plen = params.length;
    var statements = createStatementsEvaluator(statementNodes);
    var guard = guardNode && createEvaluator(guardNode);

    return guard ? guardedClosureEvaluator : unguardedClosureEvaluator;

    function unguardedClosureEvaluator(ctx /*, writer */) {
      ctx[name] = callEvaluator;
      callEvaluator.__intFunction = 'part';
      callEvaluator.__intEvaluator = bodyEvaluator;

      function callEvaluator(writer) {
        statements(createCallContext(ctx, callEvaluator, arguments), writer);
        return null;
      }

      function bodyEvaluator(writer) {
        statements(createCallContext(ctx, callEvaluator, arguments), writer);
        return true;
      }
    }

    function guardedClosureEvaluator(ctx /*, writer */) {
      var bodyEvaluator, oldEvaluator, newEvaluator;
      if ( !ctx.hasOwnProperty(name) || !isInterpolPartial(ctx[name]) ) {
        bodyEvaluator = guardedBodyEvaluator;
      }
      else {
        oldEvaluator = ctx[name].__intEvaluator;
        bodyEvaluator = branchedBodyEvaluator;
        newEvaluator = guardedBodyEvaluator;
      }
      ctx[name] = callEvaluator;
      callEvaluator.__intFunction = 'part';
      callEvaluator.__intEvaluator = bodyEvaluator;

      function callEvaluator() {
        /* jshint validthis:true */
        bodyEvaluator.apply(this, arguments);
        return null;
      }

      function guardedBodyEvaluator(writer) {
        var newCtx = createCallContext(ctx, callEvaluator, arguments);
        if ( guard(newCtx, writer) ) {
          statements(newCtx, writer);
          return true;
        }
      }

      function branchedBodyEvaluator() {
        /* jshint validthis:true */
        return newEvaluator.apply(this, arguments) ||
               oldEvaluator.apply(this, arguments);
      }
    }

    // Creates a new calling context and stores its locals from arguments
    function createCallContext(parentCtx, callEvaluator, args) {
      var newCtx = extendObject(parentCtx);
      newCtx[name] = callEvaluator;
      for ( var i = 1; i < plen; i++ ) {
        newCtx[params[i]] = args[i];
      }
      return newCtx;
    }
  }

  // generate a bound call evaluator
  function createBindEvaluator(memberNode, argNodes) {
    var member = createEvaluator(memberNode);
    var args = wrapArrayEvaluators(argNodes);
    var alen = args.length;

    return bindEvaluator;

    function bindEvaluator(ctx, writer) {
      var func = member(ctx, writer);

      if ( !isInterpolFunction(func) ) {
        if ( ctx.__intExports ) {
          return null;
        }
        throw new Error("Attempting to bind an unblessed function");
      }

      var callArgs = [];
      for ( var i = 0; i < alen; i++ ) {
        callArgs[i] = args[i](ctx, writer);
      }

      var bound = configure(func, 1, callArgs);
      bound.__intFunction = func.__intFunction;
      return bound;
    }
  }

  // generate an evaluator to perform a function or partial call
  function createCallEvaluator(memberNode, argNodes) {
    var member = createEvaluator(memberNode);
    var args = [null].concat(wrapArrayEvaluators(argNodes));
    var alen = args.length;

    return callEvaluator;

    // If we're in the process of gathering module exports, and the called
    // function can't be resolved, then just exit without exploding.
    // What happens inside of a function probably shouldn't influence the
    // top-level export context anyway
    function callEvaluator(ctx, writer) {
      var func = member(ctx, writer);

      if ( !isInterpolFunction(func) ) {
        if ( ctx.__intExports ) {
          return null;
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

  // generate an evaluator to perform local variable assignment
  function createAssignEvaluator(assignmentDefs) {
    var assigns = wrapAssignmentEvaluators(assignmentDefs).reverse();
    var alen = assigns.length - 1;

    return assignEvaluator;

    function assignEvaluator(ctx, writer) {
      for ( var i = alen; i >= 0; i-- ) {
        var assign = assigns[i];
        ctx[assign[0]] = assign[1](ctx, writer);
      }
    }
  }

  // generate an evaluator to write an html opening tag
  function createOpenTagEvaluator(nameNode, attributeDefs, selfClose) {
    var name = createEvaluator(nameNode);
    var attributes = wrapAttributeEvaluators(attributeDefs).reverse();
    var alen = attributes.length - 1;

    if ( typeof name === 'function' ) {
      return selfClose ? selfCloseFuncEvaluator : openTagFuncEvaluator;
    }
    return selfClose ? selfCloseLiteralEvaluator : openTagLiteralEvaluator;

    function selfCloseFuncEvaluator(ctx, writer) {
      writer.selfCloseElement(name(ctx, writer), getAttributes(ctx, writer));
    }

    function openTagFuncEvaluator(ctx, writer) {
      writer.startElement(name(ctx, writer), getAttributes(ctx, writer));
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
        var attribute = attributes[i];
        var key = attribute[0];

        if ( typeof key === 'function' ) {
          key = key(ctx, writer);
          if ( key === null ) {
            continue;
          }
        }

        var val = attribute[1];
        if ( typeof val === 'function' ) {
          val = val(ctx, writer);
        }
        result[key] = val;
      }
      return result;
    }
  }

  // generate an evaluator to write an html closing tag
  function createCloseTagEvaluator(nameNode) {
    var name = createEvaluator(nameNode);
    var name_func = typeof name === 'function';

    return name_func ? closeFuncEvaluator : closeLiteralEvaluator;

    function closeFuncEvaluator(ctx, writer) {
      writer.endElement(name(ctx, writer));
    }

    function closeLiteralEvaluator(ctx, writer) {
      writer.endElement(name);
    }
  }

  // generate an evaluator to write an html comment
  function createCommentTagEvaluator(contentLiteral) {
    var content = lits[contentLiteral];

    return commentTagEvaluator;

    function commentTagEvaluator(ctx, writer) {
      writer.comment(content);
    }
  }

  // generate an evaluator to write an html5 doctype
  function createDocTypeEvaluator(rootElemLiteral) {
    var rootElem = lits[rootElemLiteral];

    return docTypeEvaluator;

    function docTypeEvaluator(ctx, writer) {
      writer.docType(rootElem);
    }
  }

  // generate an evaluator that writes the result of an expression
  function createOutputEvaluator(exprNode) {
    var $1 = createEvaluator(exprNode);

    return typeof $1 !== 'function' ? outputLiteral : outputEvaluator;

    function outputEvaluator(ctx, writer) {
      writer.content($1(ctx, writer));
    }

    function outputLiteral(ctx, writer) {
      writer.content($1);
    }
  }

  // generate an evaluator that writes the result of an
  // expression without escaping
  function createRawOutputEvaluator(exprNode) {
    var $1 = createEvaluator(exprNode);

    return typeof $1 !== 'function' ? outputLiteral : outputEvaluator;

    function outputEvaluator(ctx, writer) {
      writer.rawContent($1(ctx, writer));
    }

    function outputLiteral(ctx, writer) {
      writer.rawContent($1);
    }
  }

  // generate an evaluator that performs for looping over ranges
  function createForEvaluator(rangeNodes, statementNodes, elseNodes) {
    var ranges = [];
    var rlen = rangeNodes.length;
    var statements = createStatementsEvaluator(statementNodes);
    var elseStatements = elseNodes && createStatementsEvaluator(elseNodes);

    for ( var i = 0, len = rangeNodes.length; i < len; i++ ) {
      var rangeNode = rangeNodes[i];
      ranges[i] = [
        lits[rangeNode[0]],
        wrapLiteral(createEvaluator(rangeNode[1])),
        rangeNode[2] && wrapLiteral(createEvaluator(rangeNode[2]))
      ];
    }
    ranges.reverse();

    return forEvaluator;

    function forEvaluator(ctx, writer) {
      // The entire for loop is only a single nested context
      var newCtx = extendObject(ctx);
      var statementsEvaluated = false;

      processRange(rlen - 1);
      if ( !statementsEvaluated && elseStatements ) {
        elseStatements(ctx, writer);
      }

      function processRange(idx) {
        var range = ranges[idx];
        var name = range[0];
        var data = range[1](newCtx, writer);
        var guard = range[2];
        var items = data;

        if ( typeof data !== 'object' || data === null ) {
          return;
        }

        var createItem;
        if ( isArray(data) ) {
          createItem = createArrayItem;
        }
        else {
          items = objectKeys(data);
          createItem = createObjectItem;
        }

        for ( var i = 0, len = items.length; i < len; i++ ) {
          newCtx[name] = createItem(i);
          if ( guard && !guard(newCtx, writer) ) {
            continue;
          }
          if ( idx ) {
            processRange(idx - 1);
          }
          else {
            statements(newCtx, writer);
            statementsEvaluated = true;
          }
        }

        function createArrayItem(idx) {
          return data[idx];
        }

        function createObjectItem(idx) {
          var name = items[idx];
          return { name: name, value: data[name] };
        }
      }
    }
  }
  
  // generate an evaluator that borrows the specified expressions
  // as the evaluated node's new scope for locals (remaining immutable)
  function createUsingStmtEvaluator(usingNode, evalNodes) {
    var evalExpr = createStatementsEvaluator(evalNodes);
    return buildUsingEvaluator(usingNode, evalExpr);
  }

  function createUsingExprEvaluator(usingNode, evalNode) {
    var evalExpr = createEvaluator(evalNode);
    return buildUsingEvaluator(usingNode, evalExpr);
  }

  function buildUsingEvaluator(usingNode, evalExpr) {
    var usingExprs = [null].concat(wrapArrayEvaluators(usingNode));
    var ulen = usingExprs.length;

    return usingEvaluator;

    function usingEvaluator(ctx, writer) {
      var newCtx = extendObject(ctx);
      var args = [newCtx];

      for ( var i = 1; i < ulen; i++ ) {
        args[i] = usingExprs[i](ctx, writer);
      }

      mixin.apply(null, args);
      return evalExpr(newCtx, writer);
    }
  }

  // generate a conditional (ternary) evaluator
  function createTernaryEvaluator(conditionNode, trueNode, falseNode) {
    var $1 = createEvaluator(conditionNode);
    var $2 = createEvaluator(trueNode);
    var $3 = createEvaluator(falseNode);
    return buildConditionalEvaluator($1, $2, $3);
  }

  // generate an if statement evaluator
  function createIfEvaluator(conditionNode, trueNodes, falseNodes) {
    var $1 = createEvaluator(conditionNode);
    var $2 = createStatementsEvaluator(trueNodes);
    var $3 = createStatementsEvaluator(falseNodes);
    return buildConditionalEvaluator($1, $2, $3);
  }

  // generate a match evaluator
  function createMatchEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode);
    var $2 = createEvaluator(rightNode);

    switch ( getBinaryType($1, $2) ) {
      case 0: return isMatchingObject($2, $1);
      case 1: $2 = buildMatcher($2); return maLeft;
      case 2: return maRight;
      case 3: return maBoth;
    }

    function maLeft(c, w) { return $2($1(c, w)); }
    function maRight(c, w) { return isMatchingObject($2(c, w), $1); }
    function maBoth(c, w) { return isMatchingObject($2(c, w), $1(c, w)); }
  }

  // generate an interpolation evaluator
  function createFormatEvaluator(formatNode, exprNode) {
    var $1 = createEvaluator(formatNode);
    var $1_func = typeof $1 === 'function';
    var $2 = createEvaluator(exprNode);
    var $2_func = typeof $2 === 'function';

    var template = null;
    if ( !$1_func ) {
      // we can cache everything if the left operand is a literal
      template = buildTemplate($1);
      if ( $2_func ) {
        return builtExpressionEvaluator;
      }
      if ( template.__requiresContext ) {
        return builtLiteralEvaluator;
      }
      return template($2);
    }

    var cache = {};
    var cacheCount = 0;

    // otherwise, we have to evaluate the interpolation every time
    return dynamicFormatEvaluator;

    function builtExpressionEvaluator(ctx, writer) {
      return template($2(ctx, writer), ctx);
    }

    function builtLiteralEvaluator(ctx, writer) {
      return template($2, ctx);
    }

    // If we exhaust TemplateCacheMax, then something is clearly wrong here
    // and we're not using the evaluator for localized strings.  If we keep
    // caching, we're going to start leaking memory.  So this evaluator will
    // blow away the cache and start over
    function dynamicFormatEvaluator(ctx, writer) {
      var formatStr = $1(ctx, writer);
      var data = $2_func ? $2(ctx, writer) : $2;
      var dynamicTemplate = cache[formatStr];

      if ( !dynamicTemplate ) {
        if ( cacheCount >= TemplateCacheMax ) {
          cache = {};
          cacheCount = 0;
        }
        // build and cache the dynamic template
        dynamicTemplate = buildTemplate(formatStr);
        cache[formatStr] = dynamicTemplate;
        cacheCount++;
      }

      return dynamicTemplate(data, ctx);
    }
  }

  // generate an array or object member access evaluator
  function createMemberEvaluator(parentNode, elemNode) {
    var $1 = createEvaluator(parentNode);

    if ( $1 === null ) {
      return null;
    }

    var $2 = createEvaluator(elemNode);
    var type = getBinaryType($1, $2);

    return [null, memLeft, null, memBoth][type] || ($1[$2]);

    function memLeft(c, w) {
      var parent = $1(c, w);
      if ( parent === null ) {
        return null;
      }
      var result = parent[$2];
      return result === undefined ? null : result;
    }

    function memBoth(c, w) {
      var parent = $1(c, w);
      if ( parent === null ) {
        return null;
      }
      var result = parent[$2(c, w)];
      return result === undefined ? null : result;
    }
  }

  // generate an array evaluator
  function createArrayEvaluator(elemNodes) {
    var elems = wrapArrayEvaluators(elemNodes);
    var elen = elems.length;

    return arrayEvaluator;

    function arrayEvaluator(ctx, writer) {
      var result = [];
      for ( var i = 0; i < elen; i++ ) {
        result[i] = elems[i](ctx, writer);
      }
      return result;
    }
  }

  // generate a dictionary evaluator
  function createDictionaryEvaluator(assignmentDefs) {
    var assigns = wrapAssignmentEvaluators(assignmentDefs).reverse();
    var alen = assigns.length - 1;

    return dictionaryEvaluator;

    function dictionaryEvaluator(ctx, writer) {
      var dict = {};
      for ( var i = alen; i >= 0; i-- ) {
        var assign = assigns[i];
        dict[assign[0]] = assign[1](ctx, writer);
      }
      return dict;
    }
  }

  // generate a local variable retrieval evaluator
  function createIdEvaluator(nameLiteral) {
    var name = lits[nameLiteral];
    return idEvaluator;

    function idEvaluator(ctx, writer) {
      var result = ctx[name];
      return result === undefined ? null : result;
    }
  }

}

function options() {
  return globalOptions;
}

function globals() {
  return globalContext;
}

function resolvers() {
  return globalResolvers;
}

function noOp() {}
noOp.__intFunction = 'part';

function isInterpolPartial(func) {
  return typeof func === 'function' && func.__intFunction === 'part';
}

function definePartial(ctx, name, partial) {
  ctx[name] = partial;
  partial.__intFunction = 'part';
  return partial;
}

function defineGuardedPartial(ctx, name, envelope) {
  var originalPartial = ctx[name];
  if ( !isInterpolPartial(originalPartial) ) {
    originalPartial = noOp;
  }
  definePartial(ctx, name, envelope(originalPartial));
}

// Exported Functions
exports.generateTemplateBody = buildRuntime;
exports.options = options;
exports.globals = globals;
exports.resolvers = resolvers;
exports.definePartial = definePartial;
exports.defineGuardedPartial = defineGuardedPartial;

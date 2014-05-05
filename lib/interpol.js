/*
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
  , isInterpolFunction = util.isInterpolFunction
  , createStaticMixin = util.createStaticMixin
  , isInterpolJSON = util.isInterpolJSON
  , stringify = util.stringify
  , buildTemplate = format.buildTemplate;

var CURRENT_VERSION = "0.3.12"
  , TemplateCacheMax = 256
  , globalOptions = { writer: null, errorCallback: null }
  , globalContext = {}
  , globalResolvers = []
  , parser = null;

var slice = Array.prototype.slice;

// ## Bootstrap

interpol.VERSION = CURRENT_VERSION;
interpol.options = function options() { return globalOptions; };
interpol.globals = function globals() { return globalContext; };
interpol.resolvers = function resolvers() { return globalResolvers; };
interpol.bless = bless;
interpol.evaluate = evaluate;
interpol.parse = parse;
interpol.compile = compile;

// ## Core Interpol Implementation

/**
 * Main Interpol entry point.  Compiles a template and returns a closure
 * for rendering it.  The template can either be an unparsed String or a
 * pre-parsed JSON Object.
 *
 * @param {String|Object} template the template to be compiled
 * @param {Object} [options] configuration Object passed to the compile step
 */

function interpol(template, options) {
  var parseOutput = null;
  if ( isInterpolJSON(template) ) {
    parseOutput = template;
  }
  else if ( typeof template === 'string' ) {
    parseOutput = parse(template);
  }
  else {
    throw new Error("template must be a String or JSON Object");
  }
  return compile(parseOutput, options);
}

/**
 * Convenience function to compile and execute a template against a context
 * Object and options.  Not generally recommended.
 */

function evaluate(script, obj, options) {
  var compiled = interpol(script, options);
  return compiled(obj, options);
}

/**
 * Invokes the PEG.js parser against the specified template and returns a
 * pre-parsed JSON instance.  The PEG.js parser has to be loaded for this
 * to work.
 *
 * @param {String} template the Interpol Template to be parsed
 */

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

/**
 * Converts a pre-parsed JSON instance to an evaluative closure.
 *
 * @param {Object} parseOutput the pre-parsed JSON to compile
 * @param {Object} [localOptions] Object for configuring the closure
 * @param {[Resolver]} [resolvers] Resolvers to use for performing imports
 * @param {boolean} [cache] whether or not to cache resolved imports
 */

function compile(parseOutput, localOptions) {
  var createArrayWriter = interpol.createArrayWriter
    , NullWriter = interpol.createNullWriter();

  // A lookup table of code-path generators
  var Evaluators = freezeObject({
    im: createImportEvaluator,
    de: createPartialEvaluator,
    bi: createBindEvaluator,
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
    ar: createArrayEvaluator,
    dc: createDictionaryEvaluator,
    id: createIdEvaluator,
    se: createSelfEvaluator
  });

  // literals are stored in the `l` property of parseOutput, while the parse
  // tree is stored in the `n` property.  Since a parsed Interpol module
  // is simply a set of statements, we can create a statementsEvaluator and
  // call it a day.

  var lits = parseOutput.l
    , compilerOptions = mixin({}, globalOptions, localOptions)
    , cacheModules = compilerOptions.cache
    , resolvers = compilerOptions.resolvers || globalResolvers
    , evaluator = wrapLiteral(createStatementsEvaluator(parseOutput.n))
    , exportedContext = null;

  compiledTemplate.configure = configureTemplate;
  compiledTemplate.exports = templateExports;
  return freezeObject(compiledTemplate);

  /**
   * The result of a template compilation is this closure.  `obj` is the
   * Object to be used as a working context, while `localOptions` are
   * options to be applied to a particular rendering.  If no `errorCallback`
   * is provided, calls to this function may throw errors.
   *
   * @param {Object} obj the context Object to be rendered
   * @param {Object} [localOptions] Object for configuring the current render
   * @param {Writer} [localOptions.writer] an alternative Writer to use
   * @param {Function} [localOptions.errorCallback] a callback for errors 
   */

  function compiledTemplate(obj, localOptions) {
    var ctx = mixin(extendContext(globalContext), obj)
      , processingOptions = mixin({}, globalOptions, localOptions);

    // If no Writer is provided, create a throw-away Array Writer
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

  /**
   * Returns a preconfigured version of the compiled template with a
   * default obj and options.  Convenient if you're doing DOM writing
   * or need to repeatedly call the template with the same Object.
   *
   * @param {Object} defaultObj default context Object to use
   * @param {Object} defaultOptions default Options to provide
   */

  function configureTemplate(defaultObj, defaultOptions) {
    return configure(compiledTemplate, 0, slice.call(arguments, 0));
  }

  /**
   * Returns the symbols (partials and assignments) that the compiled
   * template will product against an empty `{}` context Object.  This is
   * the method by which Interpol imports work.  Partials produced with
   * this method still have access to the global context.
   */
   
  function templateExports() {
    if ( exportedContext ) {
      return exportedContext;
    }

    // `__intExports` is an indicator to evaluators that we're processing
    // exports and so they can be a bit lax about reporting errors or 
    // resolving imports

    exportedContext = extendContext(globalContext);
    exportedContext.__intExports = true;
    evaluator(exportedContext, NullWriter);
    delete exportedContext.__intExports;

    return exportedContext;
  }
  
  // ## Evaluator Generation Utilities

  function wrapLiteral(value) {
    // if value is already a Function, we don't have to wrap it
    if ( typeof value === 'function' ) {
      return value;
    }
    return wrapper;

    function wrapper() {
      return value;
    }
  }

  // Given an array of nodes, create evaluators for each element
  function wrapArrayEvaluators(arrayNodes) {
    if ( !arrayNodes ) {
      return [];
    }

    var result = [];
    for ( var i = arrayNodes.length - 1; i >= 0; i-- ) {
      result[i] = wrapLiteral(createEvaluator(arrayNodes[i]));
    }
    return result;
  }

  // Given an array of literal ids, expand them to real values
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

  // wrap evaluators for processing HTML attributes, including the attribute
  // names, since they can also be represented by expressions
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

  // wrap evaluators for local variable assignments, name is always a literal
  function wrapAssignmentEvaluators(assignNodes) {
    if ( !assignNodes ) {
      return [];
    }

    var result = [];
    for ( var i = 0, len = assignNodes.length; i < len; i++ ) {
      var assignNode = assignNodes[i];
      result[i] = [lits[assignNode[0]],
                  wrapLiteral(createEvaluator(assignNode[1]))];
    }
    return result;
  }

  /**
   * The busiest function in the 'compile' process.  createEvaluator
   * resolves the evaluator generation function to use by taking the
   * first element of the node array.  It then passes the rest of the
   * node's elements as arguments to that generation function.
   *
   * @param {Array|Number} node Either an Array or a Literal Id
   */

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
      for ( var i = slen; i >= 0; i-- ) {
        statements[i](ctx, writer);
      }
    }
  }

  /**
   * Depending on the value types for `left` and `right`, will return an
   * index into an Array for choosing the best code-path to take in
   * evaluating an operator.  0=both are literals, 1=left is a function,
   * 2=right is a function, 3=both are functions.
   *
   * @param {Function|Mixed} left the left operand
   * @param {Function|Mixed} right the right operand
   */

  function getBinaryType(left, right) {
    var l = typeof left === 'function' ? 1 : 0
      , r = typeof right === 'function' ? 2 : 0;
    return l | r;
  }

  // ## Evaluator Generation

  // generate an evaluator to deal with 'from' and 'import' statements
  function createImportEvaluator(fromNodes) {
    var importList = []
      , ilen = fromNodes.length - 1
      , evaluator = cacheModules ? cacheableEvaluator : dynamicEvaluator;

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
        var importItem = importList[i]
          , moduleName = importItem[0]
          , moduleAlias = importItem[1]
          , toResolve = importItem[2];

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

  function isInterpolPartial(func) {
    return typeof func === 'function' && func.__intFunction === 'part';
  }

  // generate an evaluator to represent a partial and its associated closure
  function createPartialEvaluator(nameLiteral, paramDefs,
                                  statementNodes, guardNode) {
    var name = lits[nameLiteral]
      , params = [null].concat(expandLiterals(paramDefs))
      , plen = params.length
      , statements = createStatementsEvaluator(statementNodes)
      , guard = guardNode ? createEvaluator(guardNode) : null;

    return guard ? guardedClosureEvaluator : unguardedClosureEvaluator;

    function unguardedClosureEvaluator(ctx /*, writer */) {
      ctx[name] = callEvaluator;
      callEvaluator.__intFunction = 'part';
      callEvaluator.__intEvaluator = bodyEvaluator;

      function callEvaluator(writer) {
        statements(createCallContext(ctx, callEvaluator, arguments), writer);
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
      var newCtx = extendContext(parentCtx);
      newCtx[name] = callEvaluator;
      for ( var i = 1; i < plen; i++ ) {
        newCtx[params[i]] = args[i];
      }
      return newCtx;
    }
  }

  // generate a bound call evaluator
  function createBindEvaluator(memberNode, argNodes) {
    var member = createEvaluator(memberNode)
      , args = wrapArrayEvaluators(argNodes)
      , alen = args.length;

    return bindEvaluator;

    function bindEvaluator(ctx, writer) {
      var func = member(ctx, writer);

      if ( !isInterpolFunction(func) ) {
        if ( ctx.__intExports ) {
          return;
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
    var member = createEvaluator(memberNode)
      , args = [null].concat(wrapArrayEvaluators(argNodes))
      , alen = args.length;

    return callEvaluator;

    // If we're in the process of gathering module exports, and the called
    // function can't be resolved, then just exit without exploding.
    // What happens inside of a function probably shouldn't influence the
    // top-level export context anyway
    function callEvaluator(ctx, writer) {
      var func = member(ctx, writer);

      if ( !isInterpolFunction(func) ) {
        if ( ctx.__intExports ) {
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

  // generate an evaluator to perform local variable assignment
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

  // generate an evaluator to write an html opening tag
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

  // generate an evaluator to write an html closing tag
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

  // generate an evaluator that performs for looping over ranges
  function createForEvaluator(rangeNodes, statementNodes) {
    var ranges = wrapAssignmentEvaluators(rangeNodes).reverse()
      , rlen = ranges.length
      , statements = createStatementsEvaluator(statementNodes);

    return forEvaluator;

    function forEvaluator(ctx, writer) {
      // The entire for loop is only a single nested context
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

  // generate a conditional evaluator (if/else or ternary)
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

  // generate an 'or' evaluator, including short circuiting
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

  // generate an 'and' evaluator, including short circuiting
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

  // generate an equality evaluator
  function createEqEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

     return [null, eqLeft, eqRight, eqBoth][type] || ($1 == $2);

    function eqLeft(c, w) { return $1(c, w) == $2; }
    function eqRight(c, w) { return $1 == $2(c, w); }
    function eqBoth(c, w) { return $1(c, w) == $2(c, w); }
  }

  // generate an inequality evaluator
  function createNeqEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, neqLeft, neqRight, neqBoth][type] || ($1 != $2);

    function neqLeft(c, w) { return $1(c, w) != $2; }
    function neqRight(c, w) { return $1 != $2(c, w); }
    function neqBoth(c, w) { return $1(c, w) != $2(c, w); }
  }

  // generate a greater-than evaluator
  function createGtEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, gtLeft, gtRight, gtBoth][type] || ($1 > $2);

    function gtLeft(c, w) { return $1(c, w) > $2; }
    function gtRight(c, w) { return $1 > $2(c, w); }
    function gtBoth(c, w) { return $1(c, w) > $2(c, w); }
  }

  // generate a greater-than or equal to evaluator
  function createGteEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, gteLeft, gteRight, gteBoth][type] || ($1 >= $2);

    function gteLeft(c, w) { return $1(c, w) >= $2; }
    function gteRight(c, w) { return $1 >= $2(c, w); }
    function gteBoth(c, w) { return $1(c, w) >= $2(c, w); }
  }

  // generate a less-than evaluator
  function createLtEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, ltLeft, ltRight, ltBoth][type] || ($1 < $2);

    function ltLeft(c, w) { return $1(c, w) < $2; }
    function ltRight(c, w) { return $1 < $2(c, w); }
    function ltBoth(c, w) { return $1(c, w) < $2(c, w); }
  }

  // generate a less-than or equal to evaluator
  function createLteEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, lteLeft, lteRight, lteBoth][type] || ($1 <= $2);

    function lteLeft(c, w) { return $1(c, w) <= $2; }
    function lteRight(c, w) { return $1 <= $2(c, w); }
    function lteBoth(c, w) { return $1(c, w) <= $2(c, w); }
  }

  // generate an addition evaluator
  function createAddEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, addLeft, addRight, addBoth][type] || ($1 + $2);

    function addLeft(c, w) { return $1(c, w) + $2; }
    function addRight(c, w) { return $1 + $2(c, w); }
    function addBoth(c, w) { return $1(c, w) + $2(c, w); }
  }

  // generate a subtraction evaluator
  function createSubEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, subLeft, subRight, subBoth][type] || ($1 - $2);

    function subLeft(c, w) { return $1(c, w) - $2; }
    function subRight(c, w) { return $1 - $2(c, w); }
    function subBoth(c, w) { return $1(c, w) - $2(c, w); }
  }

  // generate a multiplication evaluator
  function createMulEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, mulLeft, mulRight, mulBoth][type] || ($1 * $2);

    function mulLeft(c, w) { return $1(c, w) * $2; }
    function mulRight(c, w) { return $1 * $2(c, w); }
    function mulBoth(c, w) { return $1(c, w) * $2(c, w); }
  }

  // generate a division evaluator
  function createDivEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, divLeft, divRight, divBoth][type] || ($1 / $2);

    function divLeft(c, w) { return $1(c, w) / $2; }
    function divRight(c, w) { return $1 / $2(c, w); }
    function divBoth(c, w) { return $1(c, w) / $2(c, w); }
  }

  // generate a remainder evaluator
  function createModEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode)
      , $2 = createEvaluator(rightNode)
      , type = getBinaryType($1, $2);

    return [null, modLeft, modRight, modBoth][type] || ($1 % $2);

    function modLeft(c, w) { return $1(c, w) % $2; }
    function modRight(c, w) { return $1 % $2(c, w); }
    function modBoth(c, w) { return $1(c, w) % $2(c, w); }
  }

  // generate an interpolation evaluator
  function createFormatEvaluator(formatNode, exprNode) {
    var $1 = createEvaluator(formatNode)
      , $1_func = typeof $1 === 'function'
      , $2 = createEvaluator(exprNode)
      , $2_func = typeof $2 === 'function';

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

    var cache = {}
      , cacheCount = 0;

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
      var formatStr = $1(ctx, writer)
        , data = $2_func ? $2(ctx, writer) : $2
        , dynamicTemplate = cache[formatStr];

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

  // generate a logical 'not' evaluator
  function createNotEvaluator(node) {
    var $1 = createEvaluator(node);
    return typeof $1 === 'function' ? notEvaluator : !$1;

    function notEvaluator(ctx, writer) {
      return !$1(ctx, writer);
    }
  }

  // generate a mathematic negation evaluator
  function createNegEvaluator(node) {
    var $1 = createEvaluator(node);
    return typeof $1 === 'function' ? negEvaluator : -$1;

    function negEvaluator(ctx, writer) {
      return -$1(ctx, writer);
    }
  }

  // generate an array or object member access evaluator
  function createMemberEvaluator(parentNode, elemNode) {
    var $1 = createEvaluator(parentNode)
      , $2 = createEvaluator(elemNode)
      , type = getBinaryType($1, $2);

    // do this if the left operand is a literal, though it shouldn't be
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

  // generate an array evaluator
  function createArrayEvaluator(elemNodes) {
    var elems = wrapArrayEvaluators(elemNodes)
      , elen = elems.length;

    return arrayEvaluator;

    function arrayEvaluator(ctx, writer) {
      var result = [];
      for ( var i = 0; i < elen; i++ ) {
        result[i] = elems[i](ctx, writer);
      }
      return freezeObject(result);
    }
  }

  // generate a dictionary evaluator
  function createDictionaryEvaluator(assignmentDefs) {
    var assigns = wrapAssignmentEvaluators(assignmentDefs).reverse()
      , alen = assigns.length - 1;

    return dictionaryEvaluator;

    function dictionaryEvaluator(ctx, writer) {
      var dict = {};
      for ( var i = alen; i >= 0; i-- ) {
        var assign = assigns[i];
        dict[assign[0]] = assign[1](ctx, writer);
      }
      return freezeObject(dict);
    }
  }

  // generate a local variable retrieval evaluator
  function createIdEvaluator(nameLiteral) {
    var name = lits[nameLiteral];
    return idEvaluator;

    function idEvaluator(ctx, writer) {
      return ctx[name];
    }
  }

  // generate a self-reference evaluator
  function createSelfEvaluator() {
    return selfEvaluator;

    function selfEvaluator(ctx, writer) {
      return ctx;
    }
  }
}

// Exported Functions
module.exports = interpol;

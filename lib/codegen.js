/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var jsonStringify = JSON.stringify;

var util = require('./util');

var isArray = util.isArray;
var mixin = util.mixin;
var extendObject = util.extendObject;
var objectKeys = util.objectKeys;

var slice = Array.prototype.slice;

function noOp() {}

/**
 * Converts a parse tree to a JavaScript Function that can be pulled into
 * an Interpol Runtime instance
 *
 * @param {Object} parseOutput the parse tree to use
 */

function generateFunctionBody(parseOutput) {
  // A lookup table of code generators
  var Evaluators = {
    'im': createImportEvaluator,
    'de': createPartialEvaluator,
    'bi': createBindEvaluator,
    'ca': createCallEvaluator,
    'as': createAssignEvaluator,
    'op': createOpenTagEvaluator,
    'cl': createCloseTagEvaluator,
    'ct': createCommentTagEvaluator,
    'dt': createDocTypeEvaluator,
    'ou': createOutputEvaluator,
    'ra': createRawOutputEvaluator,
    'fr': createForEvaluator,
    'us': createUsingStmtEvaluator,
    'ux': createUsingExprEvaluator,
    'cn': createTernaryEvaluator,
    'if': createIfEvaluator,
    'or': createOrEvaluator,
    'an': createAndEvaluator,
    'eq': createEqEvaluator,
    'ma': createMatchEvaluator,
    'nq': createNeqEvaluator,
    'gt': createGtEvaluator,
    'lt': createLtEvaluator,
    'ge': createGteEvaluator,
    'le': createLteEvaluator,
    'ad': createAddEvaluator,
    'su': createSubEvaluator,
    'mu': createMulEvaluator,
    'di': createDivEvaluator,
    'mo': createModEvaluator,
    'fm': createFormatEvaluator,
    'no': createNotEvaluator,
    'ne': createNegEvaluator,
    'mb': createMemberEvaluator,
    'ar': createArrayEvaluator,
    'dc': createDictionaryEvaluator,
    'id': createIdEvaluator,
    'se': createSelfEvaluator
  };

  // literals are stored in the `l` property of parseOutput, while the parse
  // tree is stored in the `n` property.  Since a parsed Interpol module
  // is simply a set of statements, we can create a statementsEvaluator and
  // call it a day.
  var lits = parseOutput.l;

  // Keeps track of name -> local mappings throughout the nesting
  var localStack = [];
  var locals = {};             // prefix -> nextId
  var names = {};              // name -> localId

  // Keeps track of globally allocated variables
  var globals = {};            // prefix -> nextId
  var generatedLiterals = {};  // literal -> globalId
  var generatedImports = {};   // funcName -> globalId
  var generatedBuilders = {};  // funcNameId,literalId -> globalId

  var globalVars = [];
  // createStatementsEvaluator will populate globalVars
  var body = createStatementsEvaluator(parseOutput.n);

  var buffer = ['"use strict";'];
  if ( globalVars.length ) {
    buffer.push("var " + globalVars.join(',') + ";");
  }
  buffer.push(body);
  return buffer.join('');

  function nextId(prefix, source) {
    var ids = source || locals;
    var next = ids[prefix];
    if ( typeof next !== 'number' ) {
      next = 0;  // seed it
    }
    var id = prefix + next;
    ids[prefix] = next + 1;
    return id;
  }

  function generateLiteral(literalValue) {
    var canonical = jsonStringify(literalValue);
    var id = generatedLiterals[canonical];
    if ( id ) {
      return id;
    }
    id = generatedLiterals[canonical] = nextId('l', globals);
    globalVars.push(id + "=" + canonical);
    return id;
  }

  function generateRuntimeImport(funcName) {
    var id = generatedImports[funcName];
    if ( id ) {
      return id;
    }
    id = generatedImports[funcName] = nextId('i', globals);
    globalVars.push(id + "=runtime." + funcName);
    return id;
  }

  function generateBuilder(funcName) {
    var funcId = generateRuntimeImport(funcName);
    var id = generatedBuilders[key] = nextId('b', globals);
    globalVars.push(id + "=" + funcId + "()");
    return id;
  }

  function generateBuilderForLiteral(funcName, literalValue) {
    var funcId = generateRuntimeImport(funcName);
    var literalId = generateLiteral(literalValue);
    var key = funcId + "/" + literalId;
    var id = generatedBuilders[key];
    if ( id ) {
      return id;
    }
    id = generatedBuilders[key] = nextId('b', globals);
    globalVars.push(id + "=" + funcId + "(" + literalId + ")");
    return id;
  }

  function pushLocals() {
    localStack.push({
      locals: locals,
      names: names
    });
    locals = extendObject(locals);
    names = extendObject(names);
  }

  function popLocals() {
    var result = localStack.pop();
    locals = result.locals;
    names = result.names;
  }

  function generateLocalForName(name) {
    var id = names[name];
    if ( id ) {
      return id;
    }
    id = names[name] = nextId('v');
    return id;
  }

  function generateLocal() {
    return nextId('v');
  }

  function isLocalLookup(name) {
    return !!names[name];
  }

  function isContextLookup(name) {
    return !isLocalLookup(name);
  }

  function generateCode(value) {
    if ( typeof value === 'function' ) {
      return value();
    }
    return value;
  }

  function generateGetter(name) {
    if ( typeof name === 'number' ) {
      name = lits[name];
    }
    if ( isLocalLookup(name) ) {
      return generateLocalForName(name);
    }
    return 'c[' + generateLiteral(name) + ']';
  }

  function generateFunction(args, contextArgs, body) {
    if ( !isArray(contextArgs) ) {
      body = contextArgs;
      contextArgs = [];
    }
    pushLocals();
    var assigns = [];
    var localNames = [];
    for ( var i = 0, len = contextArgs; i < len; i++ ) {
      var argName = contextArgs[i];
      var name = localNames[i] = generateLocalForName(argName);
      var nameLit = generateLiteral(argName);
      assigns.push('c[' + nameLit + ']=' + name);
    }
    var result = [];
    result.push('function(' + (args.concat(localNames).join(',') + '){'));
    result.push(assigns.join(';'));
    result.push(generateCode(body));
    result.push('}');
    popLocals();
    return result.join('');
  }

  function generateSubcontext(body) {
    var result = ['('];
    result.push(generateFunction(['c'], body));
    result.push(')(c);');
    return result.join('');
  }

  function generateContextAssignment(name, value) {
    var lit = generateLiteral(name);
    return ['c[', lit, ']=', generateCode(value)].join('');
  }

  function generateAssignment(name, value) {
    var id = generateLocalForName(name);
    return [id, '=' + generateContextAssignment(name, value)].join('');
  }

  function generateDeclaration(name, value) {
    return 'var ' + generateAssignment(name, value);
  }

  function generateIfStatement(condition, thenBranch, elseBranch) {
    var result = ['if('];
    result.push(generateCode(condition));
    result.push('){');
    result.push(generateCode(thenBranch));
    result.push('}');
    if ( elseBranch !== 'undefined' && elseBranch !== null ) {
      result.push('else{');
      result.push(generateCode(elseBranch));
      result.push('}');
    }
    return result.join('');
  }

  // wrap evaluators for processing HTML attributes, including the attribute
  // names, since they can also be represented by expressions
  function wrapAttributeEvaluators(keyValueNodes) {
    /* istanbul ignore if */
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
    /* istanbul ignore if */
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
   * The busiest function in the code generator.  createEvaluator
   * resolves the evaluator generation function to use by taking the
   * first element of the node array.  It then passes the rest of the
   * node's elements as arguments to that generation function.
   *
   * @param {Array|Number} node Either an Array or a Literal Id
   */

  function createEvaluator(node) {
    if ( !isArray(node) ) {
      /* istanbul ignore if */
      if ( node === null || node === undefined ) {
        throw new Error("Null Node in Parse Tree");
      }
      return generateLiteral(lits[node]);
    }

    var nodeType = lits[node[0]];
    var createFunction = Evaluators[nodeType];

    /* istanbul ignore if */
    if ( !createFunction ) {
      throw new Error("Invalid Node in Parse Tree: " + nodeType);
    }

    return createFunction.apply(node, node.slice(1));
  }

  function createBinaryEvaluator(leftNode, rightNode, operator) {
    var left = createEvaluator(leftNode);
    var right = createEvaluator(rightNode);
    return '(' + left + operator + right + ')';
  }

  function createStatementsEvaluator(statementNodes) {
    if ( !statementNodes.length ) {
      return '';
    }
    var statements = [];
    for ( var i = 0, len = statementNodes.length; i < len; i++ ) {
      statements.push(createEvaluator(statementNodes[i]));
    }
    return statements.join(';') + ';';
  }

  // generate an evaluator to deal with 'from' and 'import' statements
  function createImportEvaluator(fromNodes) {
    var result = [];
    for ( var i = 0, ilen = fromNodes.length; i < ilen; i++ ) {
      var fromNode = fromNodes[i];
      var moduleName = generateLiteral(fromNode[0]);
      var importer = generateBuilderForLiteral('buildImporter', moduleName);
      var aliases = fromNode[1];
      var moduleAlias = null;
      var toResolve = null;

      if ( isArray(aliases) ) {
        toResolve = [];
        for ( var j = 0, jlen = aliases.length; j < jlen; j++ ) {
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

      if ( !toResolve ) {
        result.push(generateDeclaration(moduleAlias), importer + '()');
        continue;
      }

      var vars = [];
      var anon = generateLocal();
      vars.push(anon + '=' + importer + '()');
      for ( var j = toResolve.length - 1; j >= 0; j-- ) {
        var aliasMap = toResolve[j];
        var aliasName = aliasMap[0];
        var aliasProperty = aliasMap[1];
        vars.push(generateAssignment(aliasName, function () {
          return [anon, '[', generateLiteral(aliasProperty), ']'].join('');
        }));
      }
      result.push('var ' + vars.join(','));
    }
    return result.join(';') + ';';
  }

  // generate an evaluator to represent a partial and its associated closure
  function createPartialEvaluator(nameLiteral, paramDefs,
                                  statementNodes, guardNode) {
    // Which partial generator are we using?
    var defineName = guardNode ? 'defineGuardedPartial' : 'definePartial';
    var definePartial = generateRuntimeImport(defineName);

    var partialName = lits[nameLiteral];
    var partialLit = generateLiteral(nameLiteral);
    var id = generateLocalForName(partialName);

    var result = ['var ' + id + '=c[' + partialLit + ']='];
    result.push(definePartial + '(c,' + partialLit + ',');


    result.push(')');
    var guard = guardNode && createEvaluator(guardNode);
    var params = [null].concat(expandLiterals(paramDefs));
    var plen = params.length;
    var statements = createStatementsEvaluator(statementNodes);

    var guard = guardNode && createEvaluator(guardNode);
    return guard ? guardedClosureEvaluator : unguardedClosureEvaluator;
  }

  // generate a bound call evaluator
  function createBindEvaluator(memberNode, argNodes) {
    var bindFunc = generateRuntimeImport('bind');
    var member = createEvaluator(memberNode);
    var args = createArrayEvaluator(argNodes);
    return bindFunc + '(' + member + ',' + args + ')';
  }

  // generate an evaluator to perform a function or partial call
  function createCallEvaluator(memberNode, argNodes) {
    var execFunc = generateRuntimeImport('exec');
    var member = createEvaluator(memberNode);
    var args = createArrayEvaluator(argNodes);
    return execFunc + '(' + member + ',' + args + ')';
  }

  // generate an evaluator to perform local variable assignment
  function createAssignEvaluator(assignmentDefs) {
    if ( !assignmentDefs.length ) {
      return '';
    }
    var assignments = [];
    for ( var i = 0, len = assignmentDefs.length; i < len; i++ ) {
      var assign = assignmentDefs[i];
      var name = createEvaluator(assign[0]);
      var value = createEvaluator(assign[1]);
      assignments.push(createSelfEvaluator() + '[' + name + ']=' + value);
    }
    return assignments.join(';') + ';';
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
    return 'w.comment(' + createEvaluator(contentLiteral) + ');';
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
    var looper = generateRuntimeImport('looper');


    // TODO: This broken
    var buffer = [];
    buffer.push(createLocalFunction(statementsNodes));
    if ( elseNodes && elseNodes.length ) {
      buffer.push(createLocalFunction(elseNodes));
    }
    for ( var i = 0, len = rangeNodes.length; i < len; i++ ) {
      var rangeNode = rangeNodes[i];
      var name = createEvaluator(rangeNode[0]);
      var collection = createEvaluator(rangeNode[1]);
      if ( i ) {
        buffer.push(looper + '(' + name + ',s,' + collection)
      }
      buffer.push(looper + '(' + name + ',' )
    }

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

  function generateCallback(node) {
    return function () {
      return node && createEvaluator(node);
    };
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
    var usingExprs = [null].concat(createArrayEvaluator(usingNode));
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
    return '(' + $1 + '?' + $2 + ':' + $3 + ')';
  }

  // generate an if statement evaluator
  function createIfEvaluator(conditionNode, trueNodes, falseNodes) {
    return generateIfStatement(
      generateCallback(conditionNode),
      generateCallback(trueNodes),
      generateCallback(falseNodes)
    );
  }

  // generate an 'or' evaluator, including short circuiting
  function createOrEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '||');
  }

  // generate an 'and' evaluator, including short circuiting
  function createAndEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '&&');
  }

  // generate a match evaluator
  function createMatchEvaluator(leftNode, rightNode) {
    var $1 = createEvaluator(leftNode);
    var $2 = createEvaluator(rightNode);
    if ( !isArray(leftNode) ) {
      var matcher = generateBuilderForLiteral('buildMatcher', $1);
      return matcher + '(' + $2 + ')';
    }

    var isMatchingObject = generateRuntimeImport('isMatchingObject');
    return isMatchingObject + '(' + $1 + ',' + $2 + ')';
  }

  // generate an equality evaluator
  function createEqEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '===');
  }

  // generate an inequality evaluator
  function createNeqEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '!==');
  }

  // generate a greater-than evaluator
  function createGtEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '>');
  }

  // generate a greater-than or equal to evaluator
  function createGteEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '>=');
  }

  // generate a less-than evaluator
  function createLtEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '<');
  }

  // generate a less-than or equal to evaluator
  function createLteEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '<=');
  }

  // generate an addition evaluator
  function createAddEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '+');
  }

  // generate a subtraction evaluator
  function createSubEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '-');
  }

  // generate a multiplication evaluator
  function createMulEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '*');
  }

  // generate a division evaluator
  function createDivEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '/');
  }

  // generate a remainder evaluator
  function createModEvaluator(leftNode, rightNode) {
    return createBinaryEvaluator(leftNode, rightNode, '%');
  }

  // generate an interpolation evaluator
  function createFormatEvaluator(formatNode, exprNode) {
    var $1 = createEvaluator(formatNode);
    if ( !isArray(formatNode) ) {
      var formatter = generateBuilderForLiteral('buildFormatter', $1);
      return formatter + '(' + createEvaluator(exprNode) + ')';
    }

    // Generate a global template cache for dynamic evaluations
    var funcId = generateRuntimeImport('buildFormatterCache');
    var id = nextId('b', globals);
    globalVars.push(id + "=" + funcId + "()");
    return id + '(' + createEvaluator(exprNode) + ')';
  }

  // generate a logical 'not' evaluator
  function createNotEvaluator(node) {
    var $1 = createEvaluator(node);
    return '(!' + $1 + ')';
  }

  // generate a mathematic negation evaluator
  function createNegEvaluator(node) {
    var $1 = createEvaluator(node);
    return '(-' + $1 + ')';
  }

  // generate an array or object member access evaluator
  function createMemberEvaluator(parentNode, elemNode) {
    var getFunc = generateRuntimeImport('getProperty');
    var $1 = createEvaluator(parentNode);
    var $2 = createEvaluator(elemNode);
    return getFunc + '(' + $1 + ',' + $2 + ')';
  }

  // generate an array evaluator
  function createArrayEvaluator(arrayNodes) {
    if ( !arrayNodes.length ) {
      return '[]';
    }

    var result = [];
    for ( var i = arrayNodes.length - 1; i >= 0; i-- ) {
      result.push(createEvaluator(arrayNodes[i]));
    }
    return '[' + result.join(',') + ']';
  }

  // generate a dictionary evaluator
  function createDictionaryEvaluator(assignmentDefs) {
    if ( !assignmentDefs.length ) {
      return '{}';
    }

    var result = [];
    for ( var i = 0, len = assignmentDefs.length; i < len; i++ ) {
      var assign = assigns[i];
      var name = createEvaluator(assign[0]);
      var value = createEvaluator(assign[1]);
      result.push(name + ':' + value);
    }
    return '{' + result.join(',') + '}';
  }

  // generate a local variable retrieval evaluator
  function createIdEvaluator(nameLiteral) {
    // TODO: If it's a var in scope, avoid calling createSelfEvaluator()
    var name = lits[nameLiteral];
    return idEvaluator;

    function idEvaluator(ctx, writer) {
      var result = ctx[name];
      return result === undefined ? null : result;
    }
  }

  // generate a self-reference evaluator
  function createSelfEvaluator() {
    return 'ctx';
  }
}

// Exported Functions
exports.generateFunctionBody = generateFunctionBody;

/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var annotations = require('./annotations');
var util = require('../util');

var getAnnotations = annotations.getAnnotations;
var hasAnnotation = annotations.hasAnnotation;

var isArray = util.isArray;
var objectKeys = util.objectKeys;
var each = util.each;
var map = util.map;

var slice = Array.prototype.slice;

var languages = {
  'javascript': require('./javascript')
};

/**
 * Converts a parse tree into source code (initially JavaScript) that can
 * be pulled into an Interpol Runtime instance.  Host Language-specific
 * constructs are avoided here and instead produced by JavaScript code
 * generation module.
 *
 * @param {Object} strippedTree the parse tree to use (rewritten & stripped)
 * @param {Mixed[]} literals A table of literal values
 * @param {Object} [options] Options used by Interpol or its CLI
 */
function generateModuleBody(strippedTree, literals, options) {
  options = options || {};
  var targetLanguage = options.targetLanguage || 'javascript';
  var lang = languages[targetLanguage];
  var sharedGlobals = !!options.globals;
  var functionWrapper = options.functionWrapper || noWrapper;

  if ( !lang ) {
    throw new Error("Unsupported Target Language: " + targetLanguage);
  }

  var globals = options.globals || lang.createGlobals();
  var gen = lang.createModule(globals);

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

  // Attach annotation retriever to create functions
  each(objectKeys(Evaluators), function (funcName) {
    var func = Evaluators[funcName];
    func.getAnnotations = function (args) {
      return args[func.length] || {};
    };
  });

  return functionWrapper(function () {
    createModuleFunction(strippedTree);
    var body = gen.toString();

    var buffer = [];
    if ( !sharedGlobals ) {
      buffer.push(globals.toString());
    }
    buffer.push(body);

    return buffer.join('');
  });

  function createModuleFunction(parseTree) {
    var defineModule = globals.runtimeImport('defineModule');

    gen.return(function () {
      gen.call(defineModule, [
        function () {
          gen.func(['c', 'w'], function () {
            // createStatementsEvaluator will populate globalVars
            createStatementsEvaluator(parseTree);
          }, getAnnotations(parseTree));
        }
      ]);
    });
  }

  function noWrapper(value) {
    if ( typeof value === 'function' ) {
      return value();
    }
    return value;
  }

  function defer(func) {
    var args = arguments;
    if ( typeof func === 'function' ) {
      args = slice.call(arguments, 1);
    }
    else {
      func = createEvaluator;
    }

    return function () {
       return func.apply(null, args);
    };
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
      var literal = globals.literal(literals[node]);
      gen.write(literal);
      return;
    }

    var nodeType = literals[node[0]];
    var createFunction = Evaluators[nodeType];

    /* istanbul ignore if */
    if ( !createFunction ) {
      throw new Error("Invalid Node in Parse Tree: " + nodeType);
    }

    // attach annotations just beyond the last known argument
    var args = node.slice(1);
    args[createFunction.length] = getAnnotations(node);
    createFunction.apply(node, args);
  }

  function createBinaryEvaluator(leftNode, rightNode, operator) {
    gen.binaryOperator(defer(leftNode), defer(rightNode), operator);
  }

  function createStatementsEvaluator(statementNodes) {
    each(statementNodes, createEvaluator);
  }

  // generate an evaluator to deal with 'from' and 'import' statements
  function createImportEvaluator(fromNodes) {
    var assigns = [];
    each(fromNodes, function (fromNode) {
      var moduleName = literals[fromNode[0]];
      var moduleNameId = globals.literal(moduleName);
      var importer = globals.builderForLiteral('buildImporter', moduleNameId);

      var aliases = fromNode[1];
      if ( !isArray(aliases) ) {
        var moduleAlias;
        if ( typeof aliases === 'number' ) {
          moduleAlias = literals[aliases];
        }
        else {
          moduleAlias = moduleName.split('/').pop();
        }
        assigns.push([
          moduleAlias,
          function () {
            gen.call(importer, []);
          }
        ]);
        return;
      }

      var toResolve = map(aliases, function (importInfo) {
        var name = literals[importInfo[0]];
        var alias = importInfo[1] ? literals[importInfo[1]] : name;
        return [alias, name];
      });

      var getProperty = globals.runtimeImport('getProperty');
      var anon = gen.anonymous();
      assigns.push([
        anon,
        function () {
          gen.call(importer, []);
        }
      ]);
      each(toResolve, function (aliasMap) {
        assigns.push([
          aliasMap[0],
          function () {
            gen.call(getProperty, [anon, globals.literal(aliasMap[1])]);
          }
        ]);
      });
    });
    gen.assignments(assigns);
  }

  // generate an evaluator to represent a partial and its associated closure
  function createPartialEvaluator(nameLiteral, paramDefs,
                                  statementNodes, guardNode) {
    var annotations = createPartialEvaluator.getAnnotations(arguments);
    var partialName = literals[nameLiteral];
    var paramNames = map(paramDefs, function (paramDef) {
      return literals[paramDef];
    });
    var create = guardNode ? createGuardedPartial : createUnguardedPartial;
    create();

    function createUnguardedPartial() {
      var definePartial = globals.runtimeImport('definePartial');
      gen.call(definePartial, [
        function () {
          gen.func(
            [gen.writer()],
            paramNames,
            defer(createStatementsEvaluator, statementNodes),
            annotations
          );
        }
      ]);
    }

    function createGuardedPartial() {
      var definePartial = globals.runtimeImport('defineGuardedPartial');
      gen.call(definePartial, [
        gen.code(function () {
          gen.getter(partialName);
        }),
        createWrapper
      ]);

      function createWrapper() {
        gen.func(['o'], function () {
          gen.return(createFunction);
        }, annotations);
      }

      function createFunction() {
        gen.func(
          [gen.writer()],
          paramNames,
          createProlog,
          defer(createStatementsEvaluator, statementNodes),
          annotations
        );
      }

      function createProlog() {
        gen.ifStatement(
          defer(guardNode),
          null,  // this is an 'else' case
          function () {
            gen.return(function () {
              gen.call('o');
            });
          }
        );
      }
    }
  }

  // generate a bound call evaluator
  function createBindEvaluator(memberNode, argNodes) {
    var bind = globals.runtimeImport('bind');
    var member = defer(memberNode);
    var args = defer(createArrayEvaluator, argNodes);
    gen.call(bind, [gen.self, member, args]);
  }

  // generate an evaluator to perform a function or partial call
  function createCallEvaluator(memberNode, argNodes) {
    var exec = globals.runtimeImport('exec');
    var member = defer(memberNode);

    var args = [gen.writer()];
    each(argNodes, function (argNode) {
      args.push(defer(argNode));
    });

    gen.call(exec, [gen.self, member, defer(gen.array, args)]);
  }

  // generate an evaluator to perform local variable assignment
  function createAssignEvaluator(assignmentDefs) {
    var decls = map(assignmentDefs, function (assignmentDef) {
      return [
        literals[assignmentDef[0]],
        defer(assignmentDef[1])
      ];
    });
    gen.assignments(decls);
  }

  // generate an evaluator to write an html opening tag
  function createOpenTagEvaluator(nameNode, attributeDefs, selfClose) {
    var name = defer(nameNode);
    var attributes = defer(createDictionaryEvaluator, attributeDefs, true);
    var methodName = selfClose ? 'selfCloseElement' : 'startElement';
    gen.statement(function () {
      gen.call(gen.writer(methodName), [name, attributes]);
    });
  }

  // generate an evaluator to write an html closing tag
  function createCloseTagEvaluator(nameNode) {
    gen.statement(function () {
      gen.call(gen.writer('endElement'), [defer(nameNode)]);
    });
  }

  // generate an evaluator to write an html comment
  function createCommentTagEvaluator(contentLiteral) {
    gen.statement(function () {
      gen.call(gen.writer('comment'), [defer(contentLiteral)]);
    });
  }

  // generate an evaluator to write an html5 doctype
  function createDocTypeEvaluator(rootElemLiteral) {
    gen.statement(function () {
      gen.call(gen.writer('docType'), [defer(rootElemLiteral)]);
    });
  }

  // generate an evaluator that writes the result of an expression
  function createOutputEvaluator(exprNode) {
    gen.statement(function () {
      gen.call(gen.writer('content'), [defer(exprNode)]);
    });
  }

  // generate an evaluator that writes the result of an
  // expression without escaping
  function createRawOutputEvaluator(exprNode) {
    gen.statement(function () {
      gen.call(gen.writer('raw'), [defer(exprNode)]);
    });
  }

  // generate an evaluator that performs for looping over ranges
  function createForEvaluator(rangeNodes, statementNodes, elseNodes) {
    var annotations = createForEvaluator.getAnnotations(arguments);
    var createSub = hasAnnotation(annotations, 'self', 'read');
    var success = null;

    if ( elseNodes && elseNodes.length ) {
      success = gen.anonymous();
      gen.assignments([
        [success, globals.literal(false)]
      ]);
      processRanges();
      gen.ifStatement(
        function () {
          gen.anonymous(success);
        },
        null,
        defer(createStatementsEvaluator, elseNodes)
      );
    }
    else {
      processRanges();
    }

    function processRanges() {
      if ( createSub ) {
        gen.statement(function () {
          gen.subcontext(
            function () {
              processRange(0);
            },
            annotations
          );
        });
      }
      else {
        processRange(0);
      }
    }

    function processRange(i) {
      if ( i === rangeNodes.length ) {
        if ( success ) {
          gen.anonymous(success, globals.literal(true));
        }
        createStatementsEvaluator(statementNodes);
        return;
      }

      var rangeNode = rangeNodes[i];
      var itemName = literals[rangeNode[0]];
      var prolog = null;

      if ( rangeNode[2] ) {
        // We have a guard
        prolog = function () {
          gen.ifStatement(
            defer(rangeNode[2]),
            null,
            function () {
              gen.return();
            }
          );
        };
      }

      gen.loopStatement(
        itemName,
        defer(rangeNode[1]),
        prolog,
        function () {
          processRange(i + 1);
        },
        annotations
      );
    }
  }

  // generate an evaluator that borrows the specified expressions
  // as the evaluated node's new scope for locals (remaining immutable)
  function createUsingStmtEvaluator(usingNodes, evalNodes) {
    var annotations = createUsingStmtEvaluator.getAnnotations(arguments);
    var body = defer(createStatementsEvaluator, evalNodes);
    gen.statement(function () {
      createUsingEvaluator(usingNodes, body, annotations);
    });
  }

  function createUsingExprEvaluator(usingNodes, evalNode) {
    var annotations = createUsingExprEvaluator.getAnnotations(arguments);
    createUsingEvaluator(
      usingNodes,
      function () {
        gen.return(defer(evalNode));
      },
      annotations
    );
  }

  function createUsingEvaluator(usingNodes, evalBody, annotations) {
    gen.usingExpression(map(usingNodes, defer), evalBody, annotations);
  }

  // generate a conditional (ternary) evaluator
  function createTernaryEvaluator(conditionNode, trueNode, falseNode) {
    gen.conditionalOperator(
      defer(conditionNode),
      defer(trueNode),
      defer(falseNode)
    );
  }

  // generate an if statement evaluator
  function createIfEvaluator(conditionNode, trueNodes, falseNodes) {
    gen.ifStatement(
      defer(conditionNode),
      trueNodes.length ? defer(createStatementsEvaluator, trueNodes) : null,
      falseNodes.length ? defer(createStatementsEvaluator, falseNodes) : null
    );
  }

  // generate an 'or' evaluator, including short circuiting
  function createOrEvaluator(leftNode, rightNode) {
    createTernaryEvaluator(leftNode, leftNode, rightNode);
  }

  // generate an 'and' evaluator, including short circuiting
  function createAndEvaluator(leftNode, rightNode) {
    createTernaryEvaluator(leftNode, rightNode, leftNode);
  }

  // generate a match evaluator
  function createMatchEvaluator(leftNode, rightNode) {
    var left = defer(leftNode);
    var right = defer(rightNode);
    if ( !isArray(rightNode) ) {
      var matcher = globals.builderForLiteral('buildMatcher', gen.code(right));
      gen.call(matcher, [left]);
      return;
    }

    var isMatchingObject = globals.runtimeImport('isMatchingObject');
    gen.call(isMatchingObject, [right, left]);
  }

  // generate an equality evaluator
  function createEqEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'eq');
  }

  // generate an inequality evaluator
  function createNeqEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'neq');
  }

  // generate a greater-than evaluator
  function createGtEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'gt');
  }

  // generate a greater-than or equal to evaluator
  function createGteEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'ge');
  }

  // generate a less-than evaluator
  function createLtEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'lt');
  }

  // generate a less-than or equal to evaluator
  function createLteEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'le');
  }

  // generate an addition evaluator
  function createAddEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'add');
  }

  // generate a subtraction evaluator
  function createSubEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'sub');
  }

  // generate a multiplication evaluator
  function createMulEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'mul');
  }

  // generate a division evaluator
  function createDivEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'div');
  }

  // generate a remainder evaluator
  function createModEvaluator(leftNode, rightNode) {
    createBinaryEvaluator(leftNode, rightNode, 'mod');
  }

  // generate an interpolation evaluator
  function createFormatEvaluator(formatNode, exprNode, supportDictNode) {
    var args = [];
    var funcName;

    var formatStr = defer(formatNode);
    if ( !isArray(formatNode) ) {
      // have to do this for left sided literals
      funcName = globals.builderForLiteral('buildFormatter',
                                           gen.code(formatStr));
    }
    else {
      // Generate a global template cache for dynamic evaluations
      funcName = globals.builder('createFormatterCache');
      args.push(formatStr);
    }

    args.push(defer(exprNode));
    if ( supportDictNode ) {
      args.push(defer(supportDictNode));
    }
    gen.call(funcName, args);
  }

  // generate a logical 'not' evaluator
  function createNotEvaluator(node) {
    var isTruthy = globals.runtimeImport('isTruthy');
    gen.unaryOperator(function () {
      gen.call(isTruthy, [defer(node)]);
    }, 'not');
  }

  // generate a mathematical negation evaluator
  function createNegEvaluator(node) {
    gen.unaryOperator(defer(node), 'neg');
  }

  // generate an array or object member access evaluator
  function createMemberEvaluator(parentNode, elemNode) {
    var getProperty = globals.runtimeImport('getProperty');
    gen.call(getProperty, [
      defer(parentNode),
      defer(elemNode)
    ]);
  }

  // generate an array evaluator
  function createArrayEvaluator(arrayNodes) {
    gen.array(map(arrayNodes, defer));
  }

  // generate a dictionary evaluator
  function createDictionaryEvaluator(propertyDefs, ordered) {
    var result = map(propertyDefs, function (propertyDef) {
      var name;
      if ( !isArray(propertyDef[0]) ) {
        name = literals[propertyDef[0]];
      }
      else {
        name = defer(propertyDef[0]);
      }
      return [name, defer(propertyDef[1])];
    });
    gen.object(result, ordered);
  }

  // generate a local variable retrieval evaluator
  function createIdEvaluator(nameLiteral) {
    gen.getter(literals[nameLiteral]);
  }

  function createSelfEvaluator() {
    gen.self();
  }
}

// Exported Functions
exports.generateModuleBody = generateModuleBody;

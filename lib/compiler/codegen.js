/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var annotations = require('./annotations');
var util = require('../util');

var getAnnotations = annotations.getAnnotations;

var isArray = util.isArray;
var objectKeys = util.objectKeys;
var each = util.each;
var map = util.map;

var slice = Array.prototype.slice;

var languages = {
  'javascript': require('./javascript')
};

function resolveTargetLanguage(targetLanguage) {
  var lang = languages[targetLanguage];
  if ( lang ) {
    return lang;
  }
  throw new Error("Unsupported Target Language: " + targetLanguage);
}

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
  var sharedGlobals = !!options.globals;
  var functionWrapper = options.functionWrapper || noWrapper;
  var targetLanguage = options.targetLanguage || 'javascript';
  var lang = resolveTargetLanguage(targetLanguage);

  var globals = options.globals || lang.createGlobals();
  var generate = lang.createModule(globals);

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
    'lc': createListCompEvaluator,
    'fr': createForEvaluator,
    'cn': createTernaryEvaluator,
    'if': createIfEvaluator,
    'or': createOrEvaluator,
    'an': createAndEvaluator,
    'ma': createMatchEvaluator,
    'eq': createEqEvaluator,
    'nq': createNeqEvaluator,
    'in': createInEvaluator,
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
    'po': createPosEvaluator,
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
    var body = generate.toString();

    var buffer = [];
    if ( !sharedGlobals ) {
      buffer.push(globals.toString());
    }
    buffer.push(body);

    return buffer.join('');
  });

  function createModuleFunction(parseTree) {
    var defineModule = globals.runtimeImport('defineModule');

    generate.returnStatement(function () {
      generate.call(defineModule, [
        function () {
          generate.func({
            internalArgs: ['c', 'w'],
            body: function () {
              // createStatementsEvaluator will populate globalVars
              createStatementsEvaluator(parseTree);
            },
            annotations: getAnnotations(parseTree)
          });
        }
      ]);
    });
  }

  function noWrapper(value) {
    return value();
  }

  function defer(func) {
    var args;
    if ( typeof func === 'function' ) {
      args = slice.call(arguments, 1);
    }
    else {
      args = slice.call(arguments, 0);
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
      /* istanbul ignore if: untestable */
      if ( node === null || node === undefined ) {
        throw new Error("Null Node in Parse Tree");
      }
      var literal = globals.literal(literals[node]);
      generate.write(literal);
      return;
    }

    var nodeType = literals[node[0]];
    var createFunction = Evaluators[nodeType];

    /* istanbul ignore if: untestable */
    if ( !createFunction ) {
      throw new Error("Invalid Node in Parse Tree: " + nodeType);
    }

    // attach annotations just beyond the last known argument
    var args = node.slice(1);
    args[createFunction.length] = getAnnotations(node);
    createFunction.apply(node, args);
  }

  function createBinaryEvaluator(operator, leftNode, rightNode) {
    generate.binaryOperator(operator, defer(leftNode), defer(rightNode));
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
      var importer = globals.builder('importer', moduleNameId);

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
            generate.call(importer, []);
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
      var anon = generate.createAnonymous();
      assigns.push([
        anon,
        function () {
          generate.call(importer, []);
        }
      ]);
      each(toResolve, function (aliasMap) {
        assigns.push([
          aliasMap[0],
          function () {
            generate.call(
              getProperty,
              [
                function () {
                  generate.retrieveAnonymous(anon);
                },
                globals.literal(aliasMap[1])
              ]
            );
          }
        ]);
      });
    });
    generate.assignments(assigns);
  }

  // generate an evaluator to represent a partial and its associated closure
  function createPartialEvaluator(nameLiteral, paramDefs,
                                  statementNodes, guardNode) {
    var annotations = createPartialEvaluator.getAnnotations(arguments);
    var paramNames = map(paramDefs, function (paramDef) {
      return literals[paramDef];
    });
    var create = guardNode ? createGuardedPartial : createUnguardedPartial;
    create();

    function createUnguardedPartial() {
      var definePartial = globals.runtimeImport('definePartial');
      generate.call(definePartial, [
        function () {
          generate.func({
            internalArgs: [generate.writer()],
            contextArgs: paramNames,
            body: defer(createStatementsEvaluator, statementNodes),
            annotations: annotations
          });
        }
      ]);
    }

    function createGuardedPartial() {
      var partialName = literals[nameLiteral];
      var definePartial = globals.runtimeImport('defineGuardedPartial');
      generate.call(definePartial, [
        generate.code(function () {
          generate.getter(partialName);
        }),
        createWrapper
      ]);

      function createWrapper() {
        generate.func({
          internalArgs: ['o'],
          body: function () {
            generate.returnStatement(createFunction);
          },
          annotations: annotations
        });
      }

      function createFunction() {
        generate.func({
          internalArgs: [generate.writer()],
          contextArgs: paramNames,
          prolog: createProlog,
          body: defer(createStatementsEvaluator, statementNodes),
          annotations: annotations
        });
      }

      function createProlog() {
        generate.ifStatement(
          defer(guardNode),
          null,  // this is an 'else' case
          function () {
            generate.returnStatement(function () {
              generate.call('o');
            });
          }
        );
      }
    }
  }

  // generate a bound call evaluator
  function createBindEvaluator(memberNode, argNodes) {
    var bindPartial = globals.runtimeImport('bindPartial');
    var member = defer(memberNode);
    var args = defer(createArrayEvaluator, argNodes);
    generate.call(bindPartial, [generate.self, member, args]);
  }

  // generate an evaluator to perform a function or partial call
  function createCallEvaluator(memberNode, argNodes) {
    var exec = globals.runtimeImport('exec');
    var member = defer(memberNode);

    var args = [generate.writer()];
    each(argNodes, function (argNode) {
      args.push(defer(argNode));
    });

    generate.call(exec, [generate.self, member, defer(generate.vector, args)]);
  }

  // generate an evaluator to perform local variable assignment
  function createAssignEvaluator(assignmentDefs) {
    var decls = map(assignmentDefs, function (assignmentDef) {
      return [
        literals[assignmentDef[0]],
        defer(assignmentDef[1])
      ];
    });
    generate.assignments(decls);
  }

  // generate an evaluator to write an html opening tag
  function createOpenTagEvaluator(nameNode, attributeDefs, selfClose) {
    var name = defer(nameNode);
    var attributes = defer(createDictionaryEvaluator, attributeDefs, true);
    var methodName = selfClose ? 'selfCloseElement' : 'startElement';
    generate.statement(function () {
      generate.call(generate.writer(methodName), [name, attributes]);
    });
  }

  // generate an evaluator to write an html closing tag
  function createCloseTagEvaluator(nameNode) {
    generate.statement(function () {
      generate.call(generate.writer('endElement'), [defer(nameNode)]);
    });
  }

  // generate an evaluator to write an html comment
  function createCommentTagEvaluator(contentLiteral) {
    generate.statement(function () {
      generate.call(generate.writer('comment'), [defer(contentLiteral)]);
    });
  }

  // generate an evaluator to write an html5 doctype
  function createDocTypeEvaluator(rootElemLiteral) {
    generate.statement(function () {
      generate.call(generate.writer('docType'), [defer(rootElemLiteral)]);
    });
  }

  // generate an evaluator that writes the result of an expression
  function createOutputEvaluator(exprNode) {
    generate.statement(function () {
      generate.call(generate.writer('content'), [defer(exprNode)]);
    });
  }

  // generate an evaluator that writes the result of an
  // expression without escaping
  function createRawOutputEvaluator(exprNode) {
    generate.statement(function () {
      generate.call(generate.writer('raw'), [defer(exprNode)]);
    });
  }

  // generate an evaluator that performs list comprehensions
  function createListCompEvaluator(rangeNodes, valueNode, nameNode) {
    var annotations = createListCompEvaluator.getAnnotations(arguments);
    var isDictionary = !!nameNode;
    var genContainer = isDictionary ? generate.dictionary : generate.vector;
    var createBody = isDictionary ? createNameValueBody: createValueBody;
    var listVar = generate.createAnonymous();

    generate.compoundExpression([
      function () {
        generate.assignAnonymous(listVar, defer(function () {
          genContainer([]);
        }));
      },
      function () {
        createLoopEvaluator(rangeNodes, createBody, annotations);
      },
      function () {
        generate.retrieveAnonymous(listVar);
      }
    ]);

    function createValueBody() {
      generate.statement(function () {
        generate.vectorAppend(listVar, defer(valueNode));
      });
    }

    function createNameValueBody() {
      generate.statement(function () {
        generate.dictionarySet(listVar, defer(nameNode), defer(valueNode));
      });
    }
  }

  // generate an evaluator that performs for looping over ranges
  function createForEvaluator(rangeNodes, statementNodes, elseNodes) {
    var annotations = createForEvaluator.getAnnotations(arguments);
    var successVar;

    if ( elseNodes && elseNodes.length ) {
      successVar = generate.createAnonymous();
      generate.assignments([
        [successVar, globals.literal(false)]
      ]);
      generate.statement(function () {
        createLoopEvaluator(rangeNodes, createBody, annotations, successVar);
      });
      generate.ifStatement(
        function () {
          generate.retrieveAnonymous(successVar);
        },
        null,
        defer(createStatementsEvaluator, elseNodes)
      );
    }
    else {
      generate.statement(function () {
        createLoopEvaluator(rangeNodes, createBody, annotations);
      });
    }

    function createBody() {
      createStatementsEvaluator(statementNodes);
    }
  }

  function createLoopEvaluator(ranges, createBody, annotations, successVar) {
    processRange(0);

    function processRange(i) {
      if ( i === ranges.length ) {
        if ( successVar ) {
          generate.statement(function () {
            generate.assignAnonymous(successVar, globals.literal(true));
          });
        }
        createBody();
        return;
      }

      var rangeNode = ranges[i];
      var itemName = literals[rangeNode[0]];
      var prolog;

      if ( rangeNode[2] ) {
        // We have a guard
        prolog = function () {
          generate.ifStatement(
            defer(rangeNode[2]),
            null,
            function () {
              generate.returnStatement();
            }
          );
        };
      }

      if ( i === 0 ) {
        genLoopExpression();
      }
      else {
        generate.statement(genLoopExpression);
      }

      function genLoopExpression() {
        generate.loopExpression({
          itemName: itemName,
          collection: defer(rangeNode[1]),
          guard: prolog,
          body: function () {
            processRange(i + 1);
          },
          annotations: annotations
        });
      }
    }
  }

  // generate a conditional (ternary) evaluator
  function createTernaryEvaluator(conditionNode, trueNode, falseNode) {
    generate.conditionalOperator(
      defer(conditionNode),
      defer(trueNode),
      defer(falseNode)
    );
  }

  // generate an if statement evaluator
  function createIfEvaluator(conditionNode, trueNodes, falseNodes) {
    generate.ifStatement(
      defer(conditionNode),
      trueNodes.length ? defer(createStatementsEvaluator, trueNodes) : null,
      falseNodes.length ? defer(createStatementsEvaluator, falseNodes) : null
    );
  }

  // generate an 'or' evaluator
  function createOrEvaluator(leftNode, rightNode) {
    var leftAnon = generate.createAnonymous();
    generate.compoundExpression([
      function () {
        generate.assignAnonymous(leftAnon, defer(leftNode));
      },
      function () {
        generate.conditionalOperator(
          leftAnon,
          leftAnon,
          defer(rightNode)
        );
      }
    ]);
  }

  // generate an 'and' evaluator
  function createAndEvaluator(leftNode, rightNode) {
    var leftAnon = generate.createAnonymous();
    generate.compoundExpression([
      function () {
        generate.assignAnonymous(leftAnon, defer(leftNode));
      },
      function () {
        generate.conditionalOperator(
          leftAnon,
          defer(rightNode),
          leftAnon
        );
      }
    ]);
  }

  // generate a match evaluator
  function createMatchEvaluator(leftNode, rightNode) {
    var left = defer(leftNode);
    var right = defer(rightNode);
    if ( !isArray(rightNode) ) {
      var matcher = globals.builder('matcher', generate.code(right));
      generate.call(matcher, [left]);
      return;
    }

    var isMatchingObject = globals.runtimeImport('matches');
    generate.call(isMatchingObject, [right, left]);
  }

  // generate an equality evaluator
  function createEqEvaluator(leftNode, rightNode) {
    createBinaryEvaluator('eq', leftNode, rightNode);
  }
  
  // generate an inequality evaluator
  function createNeqEvaluator(leftNode, rightNode) {
    createBinaryEvaluator('neq', leftNode, rightNode);
  }

  // generate an 'in' evaluator
  function createInEvaluator(leftNode, rightNode) {
    var isIn = globals.runtimeImport('isIn');
    generate.call(isIn, [defer(leftNode), defer(rightNode)]);
  }
  
  // generate a greater-than evaluator
  function createGtEvaluator(leftNode, rightNode) {
    createBinaryEvaluator('gt', leftNode, rightNode);
  }

  // generate a greater-than or equal to evaluator
  function createGteEvaluator(leftNode, rightNode) {
    createBinaryEvaluator('ge', leftNode, rightNode);
  }

  // generate a less-than evaluator
  function createLtEvaluator(leftNode, rightNode) {
    createBinaryEvaluator('lt', leftNode, rightNode);
  }

  // generate a less-than or equal to evaluator
  function createLteEvaluator(leftNode, rightNode) {
    createBinaryEvaluator('le', leftNode, rightNode);
  }

  // generate an addition evaluator
  function createAddEvaluator(leftNode, rightNode) {
    createBinaryEvaluator('add', leftNode, rightNode);
  }

  // generate a subtraction evaluator
  function createSubEvaluator(leftNode, rightNode) {
    createBinaryEvaluator('sub', leftNode, rightNode);
  }

  // generate a multiplication evaluator
  function createMulEvaluator(leftNode, rightNode) {
    createBinaryEvaluator('mul', leftNode, rightNode);
  }

  // generate a division evaluator
  function createDivEvaluator(leftNode, rightNode) {
    createBinaryEvaluator('div', leftNode, rightNode);
  }

  // generate a remainder evaluator
  function createModEvaluator(leftNode, rightNode) {
    createBinaryEvaluator('mod', leftNode, rightNode);
  }

  // generate an interpolation evaluator
  function createFormatEvaluator(formatLit, supportDictNode, exprNode) {
    var formatStr = generate.code(defer(formatLit));
    var supportDict = generate.code(defer(supportDictNode));

    var deferred = !exprNode;
    var funcName = deferred ? 'deferredFormatter' : 'immediateFormatter';
    var formatter;
    var args = [];

    if ( !isArray(supportDictNode) ) {
      // Meaning it has been created globally
      formatter = globals.builder(funcName, formatStr, supportDict);
      if ( deferred ) {
        generate.write(formatter);
        return;
      }
    }
    else {
      // Meaning we have to feed it supportFunctions at instantiation
      formatter = globals.builder(funcName, formatStr);
      args.push(supportDict);
      if ( deferred ) {
        generate.call(formatter, args);
        return;
      }
    }

    args.push(defer(exprNode));
    generate.call(formatter, args);
  }

  // generate a logical 'not' evaluator
  function createNotEvaluator(node) {
    var isTruthy = globals.runtimeImport('isTruthy');
    generate.unaryOperator('not', function () {
      generate.call(isTruthy, [defer(node)]);
    });
  }

  // generate a mathematical negation evaluator
  function createNegEvaluator(node) {
    generate.unaryOperator('neg', defer(node));
  }
  
  // generate a mathematical positive evaluator
  function createPosEvaluator(node) {
    generate.unaryOperator('pos', defer(node));
  }

  // generate an array or object member access evaluator
  function createMemberEvaluator(parentNode, elemNodes) {
    var getMember = elemNodes.length === 1 ? 'getProperty' : 'getPath';
    var args = [defer(parentNode)].concat(map(elemNodes, defer));
    generate.call(globals.runtimeImport(getMember), args);
  }

  // generate an array evaluator
  function createArrayEvaluator(arrayNodes) {
    generate.vector(map(arrayNodes, defer));
  }

  // generate a dictionary evaluator
  function createDictionaryEvaluator(propertyDefs, ordered) {
    var result = map(propertyDefs, function (propertyDef) {
      var name;
      if ( isArray(propertyDef[0]) ) {
        name = defer(propertyDef[0]);
      }
      else {
        name = literals[propertyDef[0]];
      }
      return [name, defer(propertyDef[1])];
    });
    generate.dictionary(result, ordered);
  }

  // generate a local variable retrieval evaluator
  function createIdEvaluator(nameLiteral) {
    generate.getter(literals[nameLiteral]);
  }

  function createSelfEvaluator() {
    generate.self();
  }
}

// Exported Functions
exports.generateModuleBody = generateModuleBody;

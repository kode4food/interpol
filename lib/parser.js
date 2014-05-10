/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var interpol = require('./interpol')
  , util = require('./util')
  , generatedParser  = require('../build/parser');

var isArray = util.isArray
  , mixin = util.mixin
  , freezeObject = util.freezeObject;

var inverseOperators = freezeObject({
  'eq': 'nq', 'nq': 'eq',
  'lt': 'ge', 'ge': 'lt',
  'gt': 'le', 'le': 'gt'
});

var ParamContextCheck = /(^|[^%])%[$_a-zA-Z][$_a-zA-Z0-9]*/m;

function constructModule(module) {
  var lits = [], reverseLits = {}, warnings = [];
  module = rewriteParseTree(module);
  module = replaceSymbols(module);
  return { i: 'interpol', v: -1, l: lits, n: module, e: warnings };

  function rewriteParseTree(node) {
    if ( !isArray(node) ) {
      if ( !isStatements(node) ) {
        return node;
      }
      var statements = rewriteParseTree(node.stmts);
      statements = hoistPartials(statements);
      statements = mergeAssignments(statements);
      statements = mergePartials(statements);
      statements = rollupForLoops(statements);
      return statements;
    }
    for ( var i = 0, len = node.length; i < len; i++ ) {
      node[i] = rewriteParseTree(node[i]);
    }
    if ( isOperator(node) ) {
      node = flipConditionals(node);
      node = flipEquality(node);
      node = promoteNot(node);
    }
    return node;
  }

  // Hoisting *only* occurs when the following condition is met:
  //
  //   (!partial_definition)+
  //   partial_definition+
  //
  // meaning that partial definitions can't be interspersed with
  // regular statements.  In that case, the logic is assumed too
  // complex to make a responsible guess as to the developer's
  // intentions.
  function hoistPartials(statements) {
    var partials = []
      , others = [];

    for ( var i = 0, ilen = statements.length; i < ilen; i++ ) {
      var statement = statements[i];
      if ( isPartialDef(statement) ) {
        if ( !others.length ) {
          // Short-circuit.  We're either all partials or we don't
          // meet the conditions for hoisting
          issueWarning(statement);
          return statements;
        }
        partials.push(statement);
      }
      else {
        if ( partials.length ) {
          // Short-circuit. we don't hoist under these conditions
          issueWarning(partials[partials.length - 1]);
          return statements;
        }
        others.push(statement);
      }
    }
    return partials.concat(others);
  }

  // We can combine multiple sequential lines of assignments into
  // a single assignment operation
  function mergeAssignments(statements) {
    return processStatementGroups(statements, 'as', processGroup);

    function processGroup(assignStatements) {
      var target = assignStatements[0];
      for ( var i = 1, len = assignStatements.length; i < len; i++ ) {
        target[1] = target[1].concat(assignStatements[i][1]);
      }
      return [target];
    }
  }

  // We can combine multiple sequential compatible partials into a
  // single branched partial
  function mergePartials(statements) {
    return processStatementGroups(statements, 'de', processGroup);

    function processGroup(defStatements) {
      var namedDefs = {};
      for ( var i = 0, len = defStatements.length; i < len; i++ ) {
        var statement = defStatements[i]
          , name = statement[1].value
          , group = namedDefs[name] || ( namedDefs[name] = [] );

        if ( !statement[4] && group.length ) {
          // if we see an unguarded, blow away previous definitions
          warnings.push({
            line: statement[0].line,
            column: statement[0].column,
            message: "The unguarded Partial '" + name + "' will replace " +
                     "the previous definition"
          });
          group.length = 0;
        }

        group.push(statement);
      }

      var result = [];
      for ( var key in namedDefs ) {
        var definitions = namedDefs[key];
        if ( definitions.length === 1 ) {
          result.push(definitions[0]);
          continue;
        }
        result = result.concat(mergeDefinitions(key, definitions));
      }
      return result;
    }

    function mergeDefinitions(name, definitions) {
      var firstDefinition = definitions[0]
        , originalArgs = argumentsSignature(firstDefinition[2])
        , statements = firstDefinition[3]
        , guard = firstDefinition[4];

      if ( guard ) {
        statements = [ [sym('cn'), guard, statements, [sym(null)]] ];
      }

      for ( var i = 1, len = definitions.length; i < len; i++ ) {
        var definition = definitions[i]
          , theseArgs = argumentsSignature(definition[2]);

        if ( theseArgs !== originalArgs ) {
          // Short-circuit, won't make assumptions about local names
          warnings.push({
            line: definition[0].line,
            column: definition[0].column,
            message: "Partial '" + name + "' has different argument " +
                     "names than previous definitions"
          });
          return definitions;
        }

        var theseStatements = definition[3]
          , thisGuard = definition[4];

        statements = [ [sym('cn'), thisGuard, theseStatements, statements] ];
        guard = guard && [sym('or'), thisGuard, guard];
      }

      firstDefinition[3] = statements;
      if ( guard ) {
        firstDefinition[4] = guard;
      }
      return [firstDefinition];
    }
  }

  // We can roll up a single nested for loop into a containing for
  // loop so that they share the same context
  function rollupForLoops(statements) {
    for ( var i = 0, len = statements.length; i < len; i++ ) {
      var statement = statements[i];
      if ( !isForLoop(statement) ) {
        continue;
      }
      var forStatements = statement[2];
      if ( forStatements.length !== 1 ) {
        continue;
      }
      var nested = forStatements[0];
      if ( isForLoop(nested) ) {
        statement[1] = statement[1].concat(nested[1]);
        statement[2] = nested[2];
      }
    }
    return statements;
  }

  // If the condition is 'not' we can roll up its argument
  // and flip the branches.
  function flipConditionals(node) {
    if ( !isOperator(node, 'cn') ) {
      return node;
    }
    var cond = node[1];
    if ( !isOperator(cond, 'no') ) {
      return node;
    }
    // Make it so
    node[1] = cond[1];
    var tmp = node[2];
    node[2] = node[3];
    node[3] = tmp;
    return node;
  }

  // if the operator is 'not' and it contains an equality,
  // then we can flip the equality operator and roll it up

  function flipEquality(node) {
    if ( !isOperator(node, 'no') ) {
      return node;
    }

    var child = node[1]
      , op = isOperator(child)
      , newOp = inverseOperators[op];

    if ( !op || !newOp ) {
      return node;
    }

    child[0].value = newOp;
    return child;
  }

  function promoteNot(node) {
    var op = isOperator(node, ['an', 'or']);
    if ( !op ) {
      return node;
    }

    var left = node[1]
      , leftOp = isOperator(left, 'no')
      , right = node[2]
      , rightOp = isOperator(right, 'no');

    if ( !leftOp || !rightOp ) {
      return node;
    }

    var newOp = op === 'an' && 'or' || 'an';
    return [ sym('no', left), [sym(newOp, node), left[1], right[1]] ];
  }

  // convert all symbol placeholders into symbol table entries for the
  // resulting output JSON

  function replaceSymbols(node) {
    if ( !isArray(node) ) {
      if ( isSymbol(node) ) {
        return lit(node.value);
      }
      return node;
    }
    for ( var i = 0, len = node.length; i < len; i++ ) {
      node[i] = replaceSymbols(node[i]);
    }
    return node;
  }

  function lit(value) {
    var idx = reverseLits[value];
    if ( typeof idx === 'number' ) {
      return idx;
    }
    idx = lits.push(value) - 1;
    reverseLits[value] = idx;
    return idx;
  }

  function issueWarning(statement) {
    warnings.push({
      line: statement[0].line,
      column: statement[0].column,
      message: "Will only perform 'hoisting' if all partials are placed " +
               "after other statements"
    });
  }
}

// Iterates over a set of statements and presents adjacent groups
// to the groupCallback function for replacement.
function processStatementGroups(statements, op, groupCallback) {
  statements = statements.slice(0);  // take a copy
  var wasMatch = false, start = 0;
  for ( var i = 0, len = statements.length; i < len; i++ ) {
    var statement = statements[i];
    if ( isOperator(statement, op) ) {
      if ( !wasMatch ) {
        start = i;
        wasMatch = true;
      }
    }
    else {
      if ( !wasMatch ) { continue; }
      wasMatch = false;
      processGroup(start, i);
    }
  }
  if ( wasMatch ) { processGroup(start, i); }
  return statements;

  function processGroup(start, end) {
    var len = end - start;
    if ( len === 1 ) { return; }

    var subset = statements.slice(start, end)
      , args = [start, len].concat(groupCallback(subset));
    statements.splice.apply(statements, args);
  }
}

function buildBinaryChain(head, tail) {
  if ( !tail || !tail.length ) {
    return head;
  }

  for ( var i = 0, len = tail.length; i < len; i++ ) {
    var item = tail[i];
    head = [ item[0], head, item[1] ];
  }
  return head;
}

function sym(value, type, template) {
  if ( typeof type !== 'string' ) {
    template = type;
    type = null;
  }
  return mixin({}, template || {}, { value: value, type: type || 'op' });
}

function stmts(statements) {
  return { stmts: statements, type: 'stmts' };
}

function isDefined(value) {
  return value !== null && typeof value !== 'undefined';
}

function isSymbol(node) {
  return isDefined(node) &&
         typeof node === 'object' &&
         typeof node.value !== 'undefined' &&
         typeof node.type !== 'undefined';
}

function isStatements(node) {
  return isDefined(node) &&
         typeof node === 'object' &&
         typeof node.stmts !== 'undefined' &&
         node.type === 'stmts';
}

function isOperator(node, operator) {
  if ( !isArray(node) ) {
    return false;
  }
  var item = node[0];
  if ( !isSymbol(item) || item.type !== 'op' ) {
    return false;
  }
  if ( !operator ) {
    return item.value;
  }
  if ( !isArray(operator) ) {
    return item.value === operator ? operator : false;
  }
  var idx = operator.indexOf(item.value);
  if ( idx === -1 ) {
    return false;
  }
  return operator[idx];
}

function isAutoInterpolated(node) {
  return isSymbol(node) &&
         node.type === 'auto' &&
         typeof node.value === 'string' &&
         ParamContextCheck.test(node.value);
}

function isIdentifier(node) {
  return isSymbol(node) &&
         node.type === 'id';
}

function isPartialDef(statement) {
  return isOperator(statement, 'de');
}

function isForLoop(statement) {
  return isOperator(statement, 'fr');
}

function argumentsSignature(argNames) {
  if ( !argNames || !argNames.length ) { return ''; }
  var result = [];
  for ( var i = 0, len = argNames.length; i < len; i++ ) {
    result.push(argNames[i].value);
  }
  return result.join(',');
}

// Exported Functions
exports.constructModule = constructModule;
exports.buildBinaryChain = buildBinaryChain;
exports.sym = sym;
exports.stmts = stmts;
exports.isAutoInterpolated = isAutoInterpolated;
exports.isIdentifier = isIdentifier;

interpol.parser = generatedParser;

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
  , parser = require('./parser');

var parseTemplate = parser.parseTemplate;

var isArray = util.isArray
  , freezeObject = util.freezeObject
  , stringify = util.stringify;

var sym = parser.sym
  , isSymbol = parser.isSymbol
  , isStatements = parser.isStatements
  , hasOperator = parser.hasOperator
  , isIdentifier = parser.isIdentifier
  , isLiteral = parser.isLiteral;

var inverseOperators = freezeObject({
  'eq': 'nq', 'nq': 'eq',
  'lt': 'ge', 'ge': 'lt',
  'gt': 'le', 'le': 'gt'
});

var createTag = freezeObject({
  'op': createOpenTag,
  'cl': createCloseTag,
  'ct': createCommentTag
});
  
function compileModule(template) {
  var lits = [], reverseLits = {}, warnings = [];
  var module = parseTemplate(template);
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
      statements = rollupUsingStatements(statements);
      statements = promoteRawLiteralOutput(statements);
      statements = convertLiteralHTML(statements);
      statements = mergeRawLiteralOutput(statements);
      return statements;
    }
    for ( var i = 0, len = node.length; i < len; i++ ) {
      node[i] = rewriteParseTree(node[i]);
    }
    if ( hasOperator(node) ) {
      node = flipConditionals(node);
      node = flipEquality(node);
      node = promoteNot(node);
      node = literalFromArray(node);
      node = literalFromDictionary(node);
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
    if ( statements.length < 2 ) {
      return statements;
    }

    var partials = []
      , others = []
      , invalid = null;

    for ( var i = 0, ilen = statements.length; i < ilen; i++ ) {
      var statement = statements[i];
      if ( hasOperator(statement, 'de') ) {
        if ( !invalid && !others.length ) {
          // Either all partials or we don't meet hoisting conditions
          invalid = statement;
        }
        partials.push(statement);
      }
      else {
        if ( !invalid && partials.length ) {
          // We don't hoist under these conditions
          invalid = partials[partials.length - 1];
        }
        others.push(statement);
      }
    }
    if ( invalid ) {
      if ( others.length ) {
        issueWarning(invalid);
      }
      return statements;
    }
    return partials.concat(others);
  }

  // We can combine multiple sequential lines of assignments into
  // a single assignment operation
  function mergeAssignments(statements) {
    return matchGroup(statements, matchStatement('as'), processGroup);

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
    return matchGroup(statements, matchStatement('de'), processGroup);

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
        statements = [
          [sym('cn'), guard, statements, [sym(null, 'lit')]]
        ];
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

        statements = [
          [sym('cn'), thisGuard, theseStatements, statements]
        ];
        guard = guard && [sym('or'), thisGuard, guard];
      }

      firstDefinition[3] = statements;
      if ( guard ) {
        firstDefinition[4] = guard;
      }
      return [firstDefinition];
    }
  }

  // Convert literal output to pre-escaped raw output
  function promoteRawLiteralOutput(statements) {
    return match(statements, matcher, processStatement);

    function matcher(statement) {
      return hasOperator(statement, 'ou') &&
             isLiteral(statement[1]);
    }

    function processStatement(statement) {
      return [sym('ra'), sym(stringify(statement[1].value), 'lit')];
    }
  }

  // Literal HTML tags can be converted to raw output
  function convertLiteralHTML(statements) {
    return match(statements, matcher, processStatement);

    function matcher(statement) {
      return hasOperator(statement, ['op', 'cl', 'ct']);
    }

    function processStatement(statement) {
      var op = hasOperator(statement, ['op', 'cl', 'ct'])
        , tag = createTag[op](statement);
      return tag ? [sym('ra'), sym(tag, 'lit')] : statement;
    }
  }

  // We can combine sequences of raw literal output
  function mergeRawLiteralOutput(statements) {
    return matchGroup(statements, matchStatement('ra'), processGroup);

    function processGroup(raStatements) {
      var buffer = ''
        , result = [];
      for ( var i = 0, len = raStatements.length; i < len; i++ ) {
        var statement = raStatements[i]
          , output = statement[1];
        if ( isLiteral(output) ) {
          buffer = buffer + stringify(output.value);
        }
        else {
          processBuffer();
          result.push(statement);
        }
      }
      processBuffer();
      return result;

      function processBuffer() {
        if ( !buffer.length ) {
          return;
        }
        result.push([sym('ra'), sym(buffer, 'lit')]);
        buffer = '';
      }
    }
  }

  // We can roll up a single nested for loop into a containing for
  // loop so that they share the same context
  function rollupForLoops(statements) {
    return match(statements, matcher, processStatement);

    function matcher(statement) {
      return hasOperator(statement, 'fr') &&        // is a for loop
             statement[2].length === 1 &&           // one child
             hasOperator(statement[2][0], 'fr') &&  // nested for loop
             !statement[3] && !statement[2][0][3];  // no elses
    }

    function processStatement(statement) {
      var forStatements = statement[2]
        , nested = forStatements[0];

      statement[1] = statement[1].concat(nested[1]);
      statement[2] = nested[2];
      return statement;
    }
  }

  // We can roll up a single nested 'using' statements
  function rollupUsingStatements(statements) {
    return match(statements, matcher, processStatement);

    function matcher(statement) {
      return hasOperator(statement, 'us') &&      // is a using stmt
             statement[2].length === 1 &&         // one child
             hasOperator(statement[2][0], 'us');  // nested using stmt
    }

    function processStatement(statement) {
      var nested = statement[2][0];

      statement[1] = statement[1].concat(nested[1]);
      statement[2] = nested[2];
      return statement;
    }
  }

  // If the condition is 'not' we can roll up its argument
  // and flip the branches.
  function flipConditionals(node) {
    if ( !hasOperator(node, 'cn') ) {
      return node;
    }
    var cond = node[1];
    if ( !hasOperator(cond, 'no') ) {
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
    if ( !hasOperator(node, 'no') ) {
      return node;
    }

    var child = node[1]
      , op = hasOperator(child)
      , newOp = inverseOperators[op];

    if ( !op || !newOp ) {
      return node;
    }

    child[0].value = newOp;
    return child;
  }

  // If left and right operands of an 'and' or 'or' are using the 'not'
  // unary, then promote it to the top and flip the and/or
  function promoteNot(node) {
    var op = hasOperator(node, ['an', 'or']);
    if ( !op ) {
      return node;
    }

    var left = node[1]
      , leftOp = hasOperator(left, 'no')
      , right = node[2]
      , rightOp = hasOperator(right, 'no');

    if ( !leftOp || !rightOp ) {
      return node;
    }

    var newOp = op === 'an' && 'or' || 'an';
    return [ sym('no', left), [sym(newOp, node), left[1], right[1]] ];
  }

  // If all the elements of an Array are literals, then we can convert
  // the list to a literal array for the literal table
  function literalFromArray(node) {
    if ( !hasOperator(node, 'ar') ) {
      return node;
    }
    var elements = node[1]
      , output = [];
    for ( var i = 0, len = elements.length; i < len; i++ ) {
      var element = elements[i];
      if ( !isLiteral(element) ) {
        return node;
      }
      output.push(element.value);
    }
    return sym(output, 'lit', node[0]);
  }

  // If all the elements of a Dictionary are literals, then we can
  // convert the list to a literal object for the literal table
  function literalFromDictionary(node) {
    if ( !hasOperator(node, 'dc') ) {
      return node;
    }
    var elements = node[1]
      , output = {};
    for ( var i = 0, len = elements.length; i < len; i++ ) {
      var element = elements[i]
        , name = element[0]
        , value = element[1];
      if ( (!isIdentifier(name) && !isLiteral(name)) || !isLiteral(value) ) {
        return node;
      }
      output[name.value] = value.value;
    }
    return sym(output, 'lit', node[0]);
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
    var canonical = JSON.stringify(value)
      , idx = reverseLits[canonical];
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

function matchStatement(op) {
  return matcher;

  function matcher(statement) {
    return hasOperator(statement, op);
  }
}

// Iterates over a set of statements and presents matching
// statements to the callback for replacement
function match(statements, matcher, callback) {
  var output = [];
  for ( var i = 0, len = statements.length; i < len; i++ ) {
    var statement = statements[i];
    if ( matcher(statement) ) {
      output.push(callback(statement));
    }
    else {
      output.push(statement);
    }
  }
  return output;
}

// Iterates over a set of statements and presents adjacent groups
// to the callback function for replacement
function matchGroup(statements, matcher, callback) {
  var group = []
    , output = [];

  for ( var i = 0, len = statements.length; i < len; i++ ) {
    var statement = statements[i];
    if ( matcher(statement) ) {
      group.push(statement);
    }
    else {
      processMatches();
      output.push(statement);
    }
  }
  processMatches();
  return output;

  function processMatches() {
    var result = group.length < 2 ?  group : callback(group);
    output = output.concat(result);
    group.length = 0;
  }
}

function argumentsSignature(argNames) {
  if ( !argNames || !argNames.length ) {
    return '';
  }
  var result = [];
  for ( var i = 0, len = argNames.length; i < len; i++ ) {
    result.push(argNames[i].value);
  }
  return result.join(',');
}

function createOpenTag(statement) {
  if ( !isIdentifier(statement[1]) ) {
    return;
  }

  var tag = ["<", statement[1].value]
    , attrs = statement[2];

  if ( attrs && attrs.length ) {
    for ( var i = 0, len = attrs.length; i < len; i++ ) {
      var attr = attrs[i];
      if ( !isIdentifier(attr[0]) || !isLiteral(attr[1]) ) {
        return;
      }
      var val = attr[1].value;
      if ( typeof val !== 'boolean' ) {
        tag.push(" ", attr[0].value, "=\"", stringify(attr[1].value), "\"");
        continue;
      }
      if ( val ) {
        tag.push(" ", attr[0].value);
      }
    }
  }

  if ( statement[3] ) {
    tag.push(" /");
  }
  tag.push(">");

  return tag.join('');
}

function createCloseTag(statement) {
  if ( !isIdentifier(statement[1]) ) {
    return;
  }
  return ["</", statement[1].value, ">"].join('');
}

function createCommentTag(statement) {
  return ["<!--", statement[1].value, "-->"].join('');
}

// Exported Functions
interpol.compileModule = exports.compileModule = compileModule;

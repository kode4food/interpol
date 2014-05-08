/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

{
  var ParamContextCheck = /(^|[^%])%[$_a-zA-Z][$_a-zA-Z0-9]*/m;

  var toString = Object.prototype.toString;
  var slice = Array.prototype.slice;

  var isArray = Array.isArray;
  if ( !isArray ) {
    isArray = (function () {
      return function _isArray(obj) {
        return obj && obj.length && toString.call(obj) === '[object Array]';
      };
    })();
  }

  function constructModule(module) {
    var lits = [], reverseLits = {}, warnings = [];
    module = rewriteStatements(module);
    module = replaceSymbols(module);
    return { i: 'interpol', v: -1, l: lits, n: module, e: warnings };

    function rewriteStatements(node) {
      if ( !isArray(node) ) {
        if ( isStatements(node) ) {
          var statements = rewriteStatements(node.stmts);
          statements = hoistPartials(statements);
          statements = mergeAssignments(statements);
          statements = mergePartials(statements);
          statements = rollupForLoops(statements);
          return statements;
        }
        return node;
      }
      for ( var i = 0, len = node.length; i < len; i++ ) {
        node[i] = rewriteStatements(node[i]);
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

    function issueWarning(statement) {
      warnings.push({
        line: statement[0].line,
        column: statement[0].column,
        message: "Will only perform 'hoisting' if all partials are placed " +
                 "after other statements"
      });
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
  }

  // Iterates over a set of statements and presents adjacent groups
  // to the groupCallback function for replacement.

  function processStatementGroups(statements, op, groupCallback) {
    statements = statements.slice(0);  // take a copy
    var wasMatch = false, start = 0;
    for ( var i = 0, len = statements.length; i < len; i++ ) {
      var statement = statements[i];
      if ( isArray(statement) && isOperator(statement[0], op) ) {
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

  function sym(value, type) {
    type = type || 'op';
    return { value: value, type: type, line: line(), column: column() };
  }

  function stmts(statements) {
    return { stmts: statements, type: 'stmts' };
  }

  function isSymbol(node) {
    return node != null
        && typeof node === 'object'
        && typeof node.value !== 'undefined'
        && typeof node.type !== 'undefined';
  }

  function isStatements(node) {
    return node != null
        && typeof node === 'object'
        && typeof node.stmts !== 'undefined'
        && node.type === 'stmts';
  }

  function isOperator(node, operator) {
    return isSymbol(node)
        && node.type === 'op'
        && node.value === operator;
  }

  function isString(node) {
    return isSymbol(node)
        && node.type === 'lit'
        && typeof node.value === 'string';
  }

  function isPartialDef(statement) {
    return isArray(statement) && isOperator(statement[0], 'de');
  }

  function isForLoop(statement) {
    return isArray(statement) && isOperator(statement[0], 'fr');
  }

  function argumentsSignature(argNames) {
    if ( !argNames || !argNames.length ) { return ''; }
    var result = [];
    for ( var i = 0, len = argNames.length; i < len; i++ ) {
      result.push(argNames[i].value);
    }
    return result.join(',');
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
}

start
  = m:module  {
      return constructModule(m);
    }

/* Lexer *********************************************************************/

For    = "for"    !IdentCont  { return 'fr'; }
Def    = "def"    !IdentCont  { return 'de'; }
From   = "from"   !IdentCont  { return 'im'; }
Import = "import" !IdentCont  { return 'im'; }
Let    = "let"    !IdentCont  { return 'as'; }
And    = "and"    !IdentCont  { return 'an'; }
Or     = "or"     !IdentCont  { return 'or'; }
LT     = "lt"     !IdentCont  { return 'lt'; }
GT     = "gt"     !IdentCont  { return 'gt'; }
LTE    = "le"     !IdentCont  { return 'le'; }
GTE    = "ge"     !IdentCont  { return 'ge'; }
Mod    = "mod"    !IdentCont  { return 'mo'; }
Self   = "self"   !IdentCont  { return 'se'; }
Nil   =  "nil"    !IdentCont  { return null; }
If     = "if"     !IdentCont  { return true; }
Unless = "unless" !IdentCont  { return false; }
True   = "true"   !IdentCont  { return true; }
False  = "false"  !IdentCont  { return false; }
As     = "as"     !IdentCont
In     = "in"     !IdentCont
Else   = "else"   !IdentCont
End    = "end"    !IdentCont
When   = "when"   !IdentCont

ReservedWord = ( For / Def / From / Import / Let / And / Or / LT / GT / LTE /
                 GTE / Mod / Self / Nil / If / Unless / True / False / As /
                 In / Else / End / When )

Identifier
  = !ReservedWord id:IdentifierName  {
      return sym(id, 'id');
    }

IdentifierName
  = start:IdentStart cont:IdentCont*  {
      return start + cont.join('');
    }

IdentStart
  = [$_a-zA-Z]

IdentCont
  = IdentStart
  / [$_a-zA-Z0-9]

DocType
  = [dD][oO][cC][tT][yY][pP][eE]  { return "DOCTYPE"; }

Digit
  = [0-9]

Card
  = h:[1-9] t:Digit+  {
      return h + t.join('');
    }
  / Digit

Exp
  = [eE] s:[-+]? d:Digit+  {
      return 'e' + (s ? s : '') + d.join('');
    }

Frac
  = "." d:Digit+  {
      return '.' + d.join('');
    }

Number
  = c:Card f:Frac? e:Exp?  {
      return sym(parseFloat(c + (f ? f : '') + (e ? e : '')), 'lit');
    }

Char
  = .

WS
  = [ \t\v\f]

NL
  = [\n\r]

NLOrEOF
  = NL / !.

EOL
  = WS* Comment
  / WS* NLOrEOF

Comment
  = "#" (!NLOrEOF Char)* NLOrEOF

MultiLineString
  = MLString1
  / MLString2

MLString1
  = '"""' MLTrim? chars:( !MLTail1 c:Char { return c; } )* MLTail1  {
      return sym(chars.join(''));
    }

MLString2
  = "'''" MLTrim? chars:( !MLTail2 c:Char { return c; } )* MLTail2  {
      return sym(chars.join(''));
    }

MLTrim
  = WS* NL

MLTail1
  = NL? '"""'

MLTail2
  = NL? "'''"

SimpleString
  = '"' '"'                { return sym('', 'lit'); }
  / "'" "'"                { return sym('', 'lit'); }
  / '"' c:DoubleChar+ '"'  { return sym(c.join(''), 'lit'); }
  / "'" c:SingleChar+ "'"  { return sym(c.join(''), 'lit'); }

DoubleChar
  = [^"\\]
  / CommonChar

SingleChar
  = [^'\\]
  / CommonChar

CommonChar
  = "\\\\"  { return "\\"; }
  / '\\"'   { return '"'; }
  / "\\'"   { return "'"; }
  / "\\b"   { return "\b"; }
  / "\\f"   { return "\f"; }
  / "\\n"   { return "\n"; }
  / "\\r"   { return "\r"; }
  / "\\t"   { return "\t"; }

IfUnless
  = If
  / Unless

EQ  = "=="  { return 'eq'; }
NEQ = "!="  { return 'nq'; }

Add = "+"  { return 'ad'; }
Sub = "-"  { return 'su'; }

Mul = "*"  { return 'mu'; }
Div = "/"  { return 'di'; }

Neg = "-"  { return 'ne'; }
Not = "!"  { return 'no'; }

Bind = "@"  { return 'bi'; }

Equality = NEQ / EQ
Relational = GTE / LTE / LT / GT
Additive = Add / Sub
Multiplicative = Mul / Div / Mod
Unary = Neg / Not

__ = s:( WS { return ' '; } / ( NL / Comment ) { return '\n'; } )*  {
      var res = s.join('');
      if ( !res.length ) {
        return null;
      }
      return res.indexOf('\n') !== -1 ? '\n' : ' ';
   }

_  = WS*  { return ' '; }

/** Parser *******************************************************************/

module
  = __ s:statements  { return s; }

statements
  = statements:blockStatement*  {
      var results = [];
      for ( var i = 0, len = statements.length; i < len; i++ ) {
        results.push.apply(results, statements[i][0]);
        var ws = statements[i][1];
        if ( ws ) {
          results.push([sym('ou'), sym(ws)]);
        }
      }
      return stmts(results);
    }

blockStatement
  = s:( htmlStatement / exprStatement ) ws:__  {
      return [[s], ws];
    }
  / s:interpolStatement
    t:( ( _ es:htmlStatement { return es; } ) / EOL { return null; } ) __  {
      if ( t ) {
        return [[s, t], null];
      }
      return [[s], null];
    }

statement
  = htmlStatement
  / interpolStatement
  / exprStatement

htmlStatement
  = htmlComment
  / htmlDocType
  / closeTag
  / openTag

interpolStatement
  = defStatement
  / fromStatement
  / forStatement
  / ifStatement
  / assignStatement

htmlComment
  = "<!--" comment:( !("-->") c:Char { return c; } )* "-->"  {
      return [sym('ct'), sym(comment.join(''))];
    }

htmlDocType
  = "<!" DocType _ rootElem:Identifier _ ">"  {
      return [sym('dt'), rootElem];
    }

openTag
  = "<" __ tag:htmlId __ attrs:( a:attribute  __ { return a; } )* t:tagTail  {
      return [sym('op'), tag, attrs, t];
    }

htmlId
  = Identifier
  / "(" __ e:expr __ ")"  {
      return e;
    }

tagTail
  = "/>"  { return 1; }
  / ">"   { return 0; }

attribute
  = name:htmlId value:( _ "=" __ e:expr { return e; } )?  {
      return [name, value === null ? sym(null) : value];
    }

closeTag
  = "</" __ tag:htmlId __ ">"  {
      return [sym('cl'), tag];
    }

defStatement
  = op:Def _ id:Identifier _ params:params?
    guard:( __ g:guard { return g; } )?
    stmts:performedStatements  {
      if ( guard ) {
        return [sym(op), id, params || [], stmts, guard];
      }
      return [sym(op), id, params || [], stmts];
    }

guard
  = When _ e:expr  {
      return e;
    }

performedStatements
  = _ ":" __ stmt:statement  {
      return [stmt];
    }
  / __ stmts:statements End  {
      return stmts;
    }

params
  = "(" __ params:paramList __ ")"  {
      return params;
    }
  / "(" __ ")"  {
      return [];
    }

paramList
  = start:Identifier cont:( _ "," __ id:Identifier  { return id; } )*  {
      return [start].concat(cont);
    }

fromStatement
  = op:From _ path:modulePath __ Import _ imports:importList  {
      return [sym(op), [[path, imports]]];
    }
  / op:Import _ modules:moduleList  {
      return [sym(op), modules];
    }

modulePath
  = start:moduleComp cont:( "." item:moduleComp { return item; } )*  {
      return sym([start].concat(cont).join('/'));
    }

moduleComp
  = !ReservedWord id:IdentifierName  {
      return id;
    }

importList
  = start:importItem cont:( _ "," __ item:importItem { return item; } )*  {
      return [start].concat(cont);
    }

importItem
  = name:Identifier alias:( _ As _ id:Identifier { return id; } )?  {
      if ( alias ) {
        return [name, alias];
      }
      return [name];
    }

moduleList
  = start:moduleSpecifier
    cont:( _ "," __ spec:moduleSpecifier { return spec; } )*  {
      return [start].concat(cont);
    }

moduleSpecifier
  = path:modulePath alias:( _ As _ id:Identifier  { return id; } )?  {
      if ( alias ) {
        return [path, alias];
      }
      return [path];
    }

forStatement
  = op:For _ ranges:ranges stmts:performedStatements  {
      return [sym(op), ranges, stmts];
    }

ranges
  = start:range cont:( _ "," __ r:range { return r; } )*  {
      return [start].concat(cont);
    }

range
  = id:Identifier _ In __ col:expr  {
      return [id, col];
    }

ifStatement
  = op:IfUnless _ expr:expr _ ":" __ stmt:statement  {
      if ( !op ) {
        return [sym('cn'), expr, [sym(null)], [stmt]];
      }
      return [sym('cn'), expr, [stmt], [sym(null)]];
    }
  / op:IfUnless _ expr:expr __ stmts:statements tail:ifTail  {
      if ( !op ) {
        return [sym('cn'), expr, tail, stmts];
      }
      return [sym('cn'), expr, stmts, tail];
    }

ifTail
  = Else _ ":" __ s:statement  {
      return [s];
    }
  / Else _ i:ifStatement  {
      return [i];
    }
  / Else __ stmts:statements End  {
      return stmts;
    }
  / End  {
      return [sym(null)];
    }

assignStatement
  = op:Let _ a:assignments  {
    return [sym(op), a];
  }

assignments
  = start:assignment cont:( _ "," __ a:assignment { return a; } )*  {
      return [start].concat(cont);
    }

assignment
  = id:Identifier _ "=" __ expr:expr  {
      return [id, expr];
    }

exprStatement
  = e:expr  { return [sym('ou'), e]; }

expr
  = interpolation

interpolation
  = head:conditional
    tail:( _ "%" __ r:conditional { return [sym('fm'), r]; } )*  {
      if ( !tail || !tail.length ) {
        if ( !isString(head) ) {
          return head;
        }
        var val = head.value;
        if ( ParamContextCheck.test(val) ) {
          // Need to pull it from local variables
          return [sym('fm'), head, [sym('se')]];
        }
        else {
          // Process any double percents
          head.value = val.replace(/%%/gm, '%');
          return head;
        }
      }

      var lastItem = tail[tail.length-1];
      if ( isString(lastItem[1]) ) {
        val = lastItem[1].value;
        if ( ParamContextCheck.test(val) ) {
          // Need to pull it from local variables
          tail.push([sym('fm'), [sym('se')]])
        }
        else {
          // Process any double percents
          lastItem[1].value = val.replace(/%%/gm, '%');
        }
      }
      return buildBinaryChain(head, tail);
    }

conditional
  = tval:or _ op:IfUnless __ cond:or __ Else __ fval:conditional  {
      if ( !op ) {
        return [sym('cn'), cond, [fval], [tval]];
      }
      return [sym('cn'), cond, [tval], [fval]];
    }
  / or

or
  = head:and
    tail:( _ op:Or __ r:and  { return [sym(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

and
  = head:equality
    tail:( _ op:And __ r:equality { return [sym(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

equality
  = head:relational
    tail:( _ op:Equality __ r:relational { return [sym(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

relational
  = head:additive
    tail:( _ op:Relational __ r:additive { return [sym(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

additive
  = head:multiplicative
    tail:( _ op:Additive __ r:multiplicative { return [sym(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

multiplicative
  = head:unary
    tail:( _ op:Multiplicative __ r:unary { return [sym(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

unary
  = op:Unary _ expr:unary  {
      return [sym(op), expr];
    }
  / rightCall

rightCall
  = args:leftCall calls:( _ "|" __ c:leftCall { return c; } )*  {
      if ( calls && calls.length ) {
        for ( var i = 0, len = calls.length; i < len; i++ ) {
          args = [sym('ca'), calls[i], [args]];
        }
      }
      return args;
    }

leftCall
  = callBinder:callBinder args:( _ a:callArgs { return [sym('ca'), a]; } )*  {
      return buildBinaryChain(callBinder, args);
    }

callBinder
  = op:Bind _ callBinder:callBinder _ "(" __ elems:elemList __ ")"  {
      return [sym(op), callBinder, elems];
    }
  / member

callArgs
  = "(" __ elems:elemList __ ")"  {
      return elems;
    }
  / "(" __ ")"  {
      return [];
    }

member
  = head:tuple
    tail:( _ sel:memberSelector { return [sym('mb'), sel]; } )*  {
      return buildBinaryChain(head, tail);
    }

memberSelector
  = "." __ elem:Identifier  {
      return elem;
    }
  / "[" __ elem:expr __ "]"  {
      return elem;
    }

tuple
  = "(" __ elems:elemList __ force:( "," __  { return true; } )? ")"  {
      if ( elems.length > 1 || force ) {
        return [sym('ar'), elems];
      }
      return elems[0];
    }
  / "(" __ elems:assignments __ ( "," __ )? ")" {
      return [sym('dc'), elems];
    }
  / literal

elemList
  = start:expr cont:( _ "," __ e:expr  { return e; } )*  {
      return [start].concat(cont);
    }

literal
  = number
  / string
  / boolean
  / identifier
  / self
  / nil

number
  = Number

string
  = SimpleString
  / MultiLineString

boolean
  = True   { return sym(true, 'lit'); }
  / False  { return sym(false, 'lit'); }

identifier
  = id:Identifier  {
      return [sym('id'), id];
    }

self
  = op:Self  {
      return [sym(op)];
    }

nil
  = op:Nil  {
      return sym(op, 'lit');
    }

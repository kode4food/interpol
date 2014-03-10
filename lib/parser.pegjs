/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

{
  var ParamContextCheck = /(^|[^%])%[$_a-zA-Z][$_a-zA-Z0-9]*/;

  var isArray = Array.isArray;
  if ( !isArray ) {
    isArray = (function () {
      return function _isArray(obj) {
        return obj && obj.length && toString.call(obj) === '[object Array]';
      };
    })();
  }

  // Literal Handling
  var lits = [], reverseLits = {};

  function lit(value) {
    var idx = reverseLits[value];
    if ( typeof idx === 'number' ) {
      return idx;
    }
    idx = lits.push(value) - 1;
    reverseLits[value] = idx;
    return idx;
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

  function isPartialDefinition(statement) {
    return isArray(statement) && lits[statement[0]] === 'de';
  }

  function isLetStatement(statement) {
    return isArray(statement) && lits[statement[0]] === 'as';
  }

  function hoistPartials(statements) {
    var encountered = {}
      , partials = []
      , others = [];

    for ( var i = 0, ilen = statements.length; i < ilen; i++ ) {
      var statement = statements[i];
      if ( isPartialDefinition(statement) && !encountered[statement[1]] ) {
        partials.push(statement);
        encountered[statement[1]] = true;
        continue;
      }
      else if ( isLetStatement(statement) ) {
        var assignments = statement[1];
        for ( var j = assignments.length; j--; ) {
          var assignment = assignments[j];
          encountered[assignment[0]] = true;
        }
      }
      others.push(statement);
    }

    return partials.concat(others);
  }
}

start
  = m:module  {
      return { i: 'interpol', v: -1, l: lits, n: m };
    }

/* Lexer *********************************************************************/

Def    = "def"    !IdentCont
From   = "from"   !IdentCont
Import = "import" !IdentCont
As     = "as"     !IdentCont
For    = "for"    !IdentCont
In     = "in"     !IdentCont
If     = "if"     !IdentCont
Unless = "unless" !IdentCont
Else   = "else"   !IdentCont
End    = "end"    !IdentCont
Let    = "let"    !IdentCont
True   = "true"   !IdentCont
False  = "false"  !IdentCont
LTKwd  = "lt"     !IdentCont
GTKwd  = "gt"     !IdentCont
LTEKwd = "le"     !IdentCont
GTEKwd = "ge"     !IdentCont
ModKwd = "mod"    !IdentCont
Self   = "self"   !IdentCont

ReservedWord = ( Def / From / Import / As / For / In / If / Unless / Else / 
                 End / Let / True / False / LTKwd / GTKwd / LTEKwd / GTEKwd /
                 ModKwd / Self )

Identifier
  = !ReservedWord id:IdentifierName  {
      return lit(id);
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
      return lit(parseFloat(c + (f ? f : '') + (e ? e : '')));
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
      return lit(chars.join(''));
    }

MLString2
  = "'''" MLTrim? chars:( !MLTail2 c:Char { return c; } )* MLTail2  {
      return lit(chars.join(''));
    }

MLTrim
  = WS* NL

MLTail1
  = NL? '"""'

MLTail2
  = NL? "'''"

SimpleString
  = '"' '"'                { return lit(''); }
  / "'" "'"                { return lit(''); }
  / '"' c:DoubleChar+ '"'  { return lit(c.join('')); }
  / "'" c:SingleChar+ "'"  { return lit(c.join('')); }

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
  = If      { return 'if'; }
  / Unless  { return 'unless'; }

Or  = "||"  { return 'or'; }
And = "&&"  { return 'an'; }

EQ  = "=="  { return 'eq'; }
NEQ = "!="  { return 'nq'; }

LT  = LTKwd   { return 'lt'; }
GT  = GTKwd   { return 'gt'; }
LTE = LTEKwd  { return 'le'; }
GTE = GTEKwd  { return 'ge'; }

Add = "+"  { return 'ad'; }
Sub = "-"  { return 'su'; }

Mul = "*"     { return 'mu'; }
Div = "/"     { return 'di'; }
Mod = ModKwd  { return 'mo'; }

Neg = "-"  { return 'ne'; }
Not = "!"  { return 'no'; }

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
  = __ s:statements  { return [lit('im'), s]; }

statements
  = statements:blockStatement*  {
      var results = [];
      for ( var i = 0, len = statements.length; i < len; i++ ) {
        results.push.apply(results, statements[i][0]);
        var ws = statements[i][1];
        if ( ws ) {
          results.push([lit('ou'), lit(ws)]);
        }
      }
      return hoistPartials(results);
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
  / letStatement

htmlComment
  = "<!--" comment:( !("-->") c:Char { return c; } )* "-->"  {
      return [lit('ct'), lit(comment.join(''))];
    }

htmlDocType
  = "<!" DocType _ rootElem:Identifier _ ">"  {
      return [lit('dt'), rootElem];
    }

openTag
  = "<" __ tag:htmlId __ attrs:( a:attribute  __ { return a; } )* t:tagTail  {
      return [lit('op'), tag, attrs, t];
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
      return [name, value === null ? lit(null) : value];
    }

closeTag
  = "</" __ tag:htmlId __ ">"  {
      return [lit('cl'), tag];
    }

defStatement
  = Def _ id:Identifier _ params:params? stmts:performedStatements  {
      return [lit('de'), id, params || [], stmts];
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
  = From _ path:modulePath __ Import _ imports:importList  {
      return [lit('mi'), [[path, imports]]];
    }
  / Import _ modules:moduleList  {
      return [lit('mi'), modules];
    }

modulePath
  = start:moduleComp cont:( "." item:moduleComp { return item; } )*  {
      return lit([start].concat(cont).join('/'));
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
    return [path, alias];
  }

forStatement
  = For _ ranges:ranges stmts:performedStatements  {
      return [lit('fr'), ranges, stmts];
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
      if ( op === 'unless' ) { expr = [lit('no'), expr]; }
      return [lit('cn'), expr, [stmt], [lit(null)]];
    }
  / op:IfUnless _ expr:expr __ stmts:statements tail:ifTail  {
      if ( op === 'unless' ) { expr = [lit('no'), expr]; }
      return [lit('cn'), expr, stmts, tail];
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
      return [lit(null)];
    }

letStatement
  = Let _ a:assignments  {
    return [lit('as'), a];
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
  = e:expr  { return [lit('ou'), e]; }

expr
  = interpolation

interpolation
  = head:conditional
    tail:( _ "%" __ r:conditional { return [lit('fm'), r]; } )*  {
      if ( ( !tail || !tail.length ) && !isArray(head) ) {
        var val = lits[head];
        if ( typeof val === 'string' && ParamContextCheck.test(val) ) {
          return [lit('fm'), head, [lit('se')]];
        }
      }
      return buildBinaryChain(head, tail);
    }

conditional
  = cond:or _ "?" __ tval:conditional __ ":" __ fval:conditional  {
      return [lit('cn'), cond, [tval], [fval]];
    }
  / or

or
  = head:and
    tail:( _ op:Or __ r:and  { return [lit(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

and
  = head:equality
    tail:( _ op:And __ r:equality { return [lit(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

equality
  = head:relational
    tail:( _ op:Equality __ r:relational { return [lit(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

relational
  = head:additive
    tail:( _ op:Relational __ r:additive { return [lit(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

additive
  = head:multiplicative
    tail:( _ op:Additive __ r:multiplicative { return [lit(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

multiplicative
  = head:unary
    tail:( _ op:Multiplicative __ r:unary { return [lit(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

unary
  = op:Unary _ expr:unary  {
      return [lit(op), expr];
    }
  / call

call
  = member:member args:( _ a:callArgs { return a; } )?  {
      if ( args ) {
        return [lit('ca'), member, args];
      }
      return member;
    }

callArgs
  = "(" __ elems:elemList __ ")"  {
      return elems;
    }
  / "(" __ ")"  {
      return [];
    }

member
  = head:tuple
    tail:( _ sel:memberSelector { return [lit('mb'), sel]; } )*  {
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
  = "(" __ elems:elemList __ ")"  {
      if ( elems.length > 1 ) {
        return [lit('tu'), elems];
      }
      return elems[0];
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

number
  = Number

string
  = SimpleString
  / MultiLineString

boolean
  = True   { return lit(true); }
  / False  { return lit(false); }

identifier
  = id:Identifier  {
      return [lit('id'), id];
    }

self
  = Self  {
      return [lit('se')];
    }

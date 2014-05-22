/*
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

{
  var parser = require('../lib/parser')
    , buildBinaryChain = parser.buildBinaryChain
    , symAutoInterpolate = parser.symAutoInterpolate
    , isAutoInterpolated = parser.isAutoInterpolated
    , isIdentifier = parser.isIdentifier
    , sym = parser.sym
    , stmts = parser.stmts;

  function sym(value, type) {
    return {
      value: value,
      type: type || 'op',
      line: line(),
      column: column()
    };
  }
}

start = module

/* Lexer *********************************************************************/

For    = "for"    !IdentCont  { return 'fr'; }
Def    = "def"    !IdentCont  { return 'de'; }
From   = "from"   !IdentCont  { return 'im'; }
Import = "import" !IdentCont  { return 'im'; }
Let    = "let"    !IdentCont  { return 'as'; }
And    = "and"    !IdentCont  { return 'an'; }
Or     = "or"     !IdentCont  { return 'or'; }
Like   = "like"   !IdentCont  { return 'ma'; }
LT     = "lt"     !IdentCont  { return 'lt'; }
GT     = "gt"     !IdentCont  { return 'gt'; }
LTE    = "le"     !IdentCont  { return 'le'; }
GTE    = "ge"     !IdentCont  { return 'ge'; }
Mod    = "mod"    !IdentCont  { return 'mo'; }
Self   = "self"   !IdentCont  { return 'se'; }
Not    = "not"    !IdentCont  { return 'no'; }
Nil    = "nil"    !IdentCont  { return null; }
If     = "if"     !IdentCont  { return true; }
Unless = "unless" !IdentCont  { return false; }
True   = "true"   !IdentCont  { return true; }
False  = "false"  !IdentCont  { return false; }
As     = "as"     !IdentCont
In     = "in"     !IdentCont
Else   = "else"   !IdentCont
End    = "end"    !IdentCont
When   = "when"   !IdentCont

ReservedWord = ( For / Def / From / Import / Let / And / Or / Like / LT / GT / 
                 LTE / GTE / Mod / Self / Not / Nil / If / Unless / True / 
                 False / As / In / Else / End / When )

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
      return symAutoInterpolate(chars.join(''));
    }

MLString2
  = "'''" MLTrim? chars:( !MLTail2 c:Char { return c; } )* MLTail2  {
      return sym(chars.join(''), 'lit');
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
  / '"' c:DoubleChar+ '"'  { return symAutoInterpolate(c.join('')); }
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

Bind = "@"  { return 'bi'; }

Equality = Like / NEQ / EQ
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
          results.push([sym('ou'), sym(ws, 'lit')]);
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
      return [sym('ct'), sym(comment.join(''), 'lit')];
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
    stmts:defStatements  {
      params = params || {};
      var guards = params.guards || [];
      if ( guards.length ) {
        if ( guard ) { guards.push(guard); }
        guard = guards[0];
        for ( var i = 1, len = guards.length; i < len; i++ ) {
          guard = [sym('an'), guard, guards[i]];
        }
      }

      if ( guard ) {
        return [sym(op), id, params.ids || [], stmts, guard];
      }
      return [sym(op), id, params.ids || [], stmts];
    }

guard
  = When _ e:expr  {
      return e;
    }

defStatements
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
  = start:(Identifier / expr)
    cont:( _ "," __ param:(Identifier / expr)  { return param; } )*  {
      var ids = [], guards = [], items = [start].concat(cont);
      for ( var i = 0, len = items.length; i < len; i++ ) {
        var item = items[i];
        if ( isIdentifier(item) ) {
          ids.push(item);
          continue;
        }
        var idSym = sym(i, 'lit');
        ids.push(idSym);
        guards.push([sym('ma'), [sym('id'), idSym], item]);
      }
      return { ids: ids, guards: guards };
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
  = op:For _ ranges: ranges _ ":" __ stmt:statement  {
      return [sym(op), ranges, stmts];
    }
  / op:For _ ranges:ranges __ stmts:statements tail:elseTail  {
      return [sym(op), ranges, stmts, tail];
    }

ranges
  = start:range cont:( _ "," __ r:range { return r; } )*  {
      return [start].concat(cont);
    }

range
  = id:Identifier _ In __ col:expr
    guard:( __ g:guard { return g; } )?  {
      if ( guard ) {
        return [id, col, guard];
      }
      return [id, col];
    }

ifStatement
  = op:IfUnless _ expr:expr _ ":" __ stmt:statement  {
      if ( !op ) {
        return [sym('cn'), expr, [sym(null)], [stmt]];
      }
      return [sym('cn'), expr, [stmt], [sym(null)]];
    }
  / op:IfUnless _ expr:expr __ stmts:statements tail:elseTail  {
      if ( !op ) {
        return [sym('cn'), expr, tail, stmts];
      }
      return [sym('cn'), expr, stmts, tail];
    }

elseTail
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
        if ( !isAutoInterpolated(head) ) { return head; }
        return [sym('fm'), head, [sym('se')]];
      }

      var lastItem = tail[tail.length-1];
      if ( isAutoInterpolated(lastItem[1]) ) {
        tail.push([sym('fm'), [sym('se')]])
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
  = head:list
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

list
  = "(" __ elems:elemList __ force:( "," __  { return true; } )? ")"  {
      if ( elems.length > 1 || force ) {
        return [sym('ar'), elems];
      }
      return elems[0];
    }
  / "(" __ elems:assignments __ ( "," __ )? ")" {
      return [sym('dc'), elems];
    }
  / "(" __ ")"  {
      return [sym('ar'), []];
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

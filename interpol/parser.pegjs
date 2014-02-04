/*!
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

{
  //var syms = [ false, true ]
  //  , rsym = { false: 0, true: 1 };
  var syms = [], rsym = {};

  function sym(value) {
    var idx = rsym[value];
    if ( typeof idx === 'number' ) {
      return idx;
    }
    idx = syms.push(value) - 1;
    rsym[value] = idx;
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
}

start
  = m:module  {
      return { l: 'interpol', v: -1, s: syms, n: m };
    }

/* Lexer *********************************************************************/

Def    = "def"    !IdentCont
From   = "from"   !IdentCont
Import = "import" !IdentCont
As     = "as"     !IdentCont
For    = "for"    !IdentCont
In     = "in"     !IdentCont
If     = "if"     !IdentCont
Else   = "else"   !IdentCont
Case   = "case"   !IdentCont
End    = "end"    !IdentCont
True   = "true"   !IdentCont  { return 1; }
False  = "false"  !IdentCont  { return 0; }
OrKwd  = "or"     !IdentCont
AndKwd = "and"    !IdentCont  { return 'an'; }
LTKwd  = "lt"     !IdentCont
GTKwd  = "gt"     !IdentCont
LTEKwd = "le"     !IdentCont
GTEKwd = "ge"     !IdentCont
NotKwd = "not"    !IdentCont  { return 'no'; }

ReservedWord = ( Def / From / Import / As / For / In / If / Else / Case /
                 End / True / False / OrKwd / AndKwd / LTKwd / GTKwd /
                 LTEKwd / GTEKwd / NotKwd )

Identifier
  = !ReservedWord id:IdentifierName  {
      return sym(id);
    }

IdentifierName
  = start:IdentStart cont:IdentCont*  {
      return start + cont.join('');
    }

IdentStart
  = [$__a-zA-Z]

IdentCont
  = IdentStart
  / [$__a-zA-Z0-9]

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
      return sym(parseFloat(c + (f ? f : '') + (e ? e : '')));
    }

Char
  = .

WS
  = [\t\v\f ]

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
  = '"' !('""') chars:[^"\n\r\u2028\u2029]* '"'  {
      return sym(chars.join(''));
    }
  / "'" !("''") chars:[^'\n\r\u2028\u2029]* "'"  {
      return sym(chars.join(''));
    }

Or  = OrKwd  / "||"  { return 'or'; }
And = AndKwd / "&&"  { return 'an'; }

EQ  = "=="  { return 'eq'; }
NEQ = "!="  { return 'nq'; }

LT  = LTKwd
GT  = GTKwd
LTE = LTEKwd
GTE = GTEKwd

Add = "+"  { return 'ad'; }
Sub = "-"  { return 'su'; }

Mul = "*"  { return 'mu'; }
Div = "/"  { return 'di'; }

Neg = "-"           { return 'ne'; }
Not = NotKwd / "!"  { return 'no'; }

Equality = NEQ / EQ
Relational = GTE / LTE / LT / GT
Additive = Add / Sub
Multiplicative = Mul / Div
Unary = Neg / Not

_
  = WS*

__
  = ( WS / NL / Comment )*

/** Parser *******************************************************************/

module
  = s:statements

statements
  = statements:( __ s:statement __ { return s; } )*  {
      return [sym('st'), statements];
    }

statement
  = htmlComment
  / closeTag
  / openTag
  / defStatement
  / fromStatement
  / forStatement
  / exprStatement

openTag
  = "<" id:Identifier _ attrs:( a:attribute  __ { return a; } )* t:tagTail  {
      return [sym('op'), id, attrs, t];
    }

tagTail
  = "/>"  { return 1; }
  / ">"   { return 0; }

attribute
  = id:Identifier value:(_ "=" __ e:expr { return e; })?  {
      return [id, value === null ? sym(null) : value];
    }

closeTag
  = "</" id:Identifier __ ">"  {
      return [sym('cl'), id];
    }

htmlComment
  = "<!--" comment:( !("-->") c:Char { return c; } )* "-->"  {
      return [sym('ct'), sym(comment.join(''))];
    }

defStatement
  = Def _ id:Identifier _ params:params? _ ":" _ stmt:statement EOL  {
      return [sym('de'), id, params, [sym('st'), [stmt]]]
    }
  / Def _ id:Identifier _ params:params? EOL stmts:statements End  {
      return [sym('de'), id, params, stmts]
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
  = From _ id:Identifier __ Import _ imports:importList EOL  {
      return [sym('im'), id, imports];
    }

importList
  = start:importItem cont:( _ "," __ item:importItem { return item; } )*  {
      return [start].concat(cont);
    }

importItem
  = name:Identifier alias:( _ As _ id:Identifier { return id; } )?  {
      return [name, alias];
    }

forStatement
  = For _ ranges:ranges _ ":" _ stmt:statement EOL  {
      return [sym('fr'), ranges, [sym('st'), [stmt]]]
    }
  / For _ ranges:ranges EOL stmts:statements End  {
      return [sym('fr'), ranges, stmts]
    }

ranges
  = start:range cont:( _ "," __ range )*  {
      return [start].concat(cont);
    }

range
  = id:Identifier _ In _ col:expr  {
      return [id, col];
    }

exprStatement
  = e:expr  { return [sym('ou'), e]; }

expr
  = conditional

conditional
  = cond:or _ "?" __ tval:conditional _ ":" __ fval:conditional  {
      return [sym('cn'), cond, tval, fval];
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
  = head:interpolation
    tail:( _ op:Relational __ r:interpolation { return [sym(op), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

interpolation
  = head:additive
    tail:( _ "%" __ r:additive { return [sym('fm'), r]; } )*  {
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
  = op:Unary _ expr:call  {
      return [sym(op), expr];
    }
  / call

call
  = id:Identifier _ args:tuple  {
      return [sym('ca'), id, args];
    }
  / member

member
  = expr:tuple _ "." __ elem:Identifier  {
      return [sym('mb'), expr, elem];
    }
  / expr:tuple _ "[" __ elem:expr __ "]"  {
      return [sym('mb'), expr, elem];
    }
  / tuple

tuple
  = "(" __ elems:elemList __ ")"  {
      return [sym('tu'), elems];
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

number
  = Number

string
  = SimpleString
  / MultiLineString

boolean
  = True
  / False

identifier
  = id:Identifier {
      return [sym('id'), id];
    }

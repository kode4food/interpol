/*!
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

{
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
  = module

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
True   = "true"   !IdentCont  { return true; }
False  = "false"  !IdentCont  { return false; }
EQ     = "eq"     !IdentCont
NEQ    = "neq"    !IdentCont
LT     = "lt"     !IdentCont
GT     = "gt"     !IdentCont
LTE    = "lte"    !IdentCont
GTE    = "gte"    !IdentCont

ReservedWord = ( Def / From / Import / As / For / In / If / Else / Case / End /
                 True / False / EQ / NEQ / LT / GT / LTE / GTE )

Identifier
  = !ReservedWord id:IdentifierName  {
      return id;
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
      return parseFloat(c + (f ? f : '') + (e ? e : ''));
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
      return chars.join('');
    }

MLString2
  = "'''" MLTrim? chars:( !MLTail2 c:Char { return c; } )* MLTail2  {
        return chars.join('');
    }

MLTrim
  = WS* NL

MLTail1
  = NL? '"""'

MLTail2
  = NL? "'''"

SimpleString
  = '"' !('""') chars:[^"\n\r\u2028\u2029]* '"'  {
      return chars.join('');
    }
  / "'" !("''") chars:[^'\n\r\u2028\u2029]* "'"  {
      return chars.join('');
    }


Add = "+"  { return 'add'; }
Sub = "-"  { return 'sub'; }
Mul = "*"  { return 'mul'; }
Div = "/"  { return 'div'; }
Neg = "-"  { return 'neg'; }
Not = "!"  { return 'not'; }

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
      return ['stmts', statements];
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
      return ['open', id, attrs, t];
    }

tagTail
  = "/>"  { return true; }
  / ">"   { return false; }

attribute
  = id:Identifier _ "=" __ expr:expr  {
      return [id, expr];
    }
  / id:Identifier  {
      return [id, true];
    }

closeTag
  = "</" id:Identifier __ ">"  {
      return ['close', id];
    }

htmlComment
  = "<!--" comment:( !("-->") c:Char { return c; } )* "-->"  {
      return ['comment', comment.join('')];
    }

defStatement
  = Def _ id:Identifier _ params:params? _ ":" _ stmt:statement EOL  {
      return ['def', id, params, ['stmts', [stmt]]]
    }
  / Def _ id:Identifier _ params:params? EOL stmts:statements End  {
      return ['def', id, params, stmts]
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
      return ['from', id, imports];
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
      return ['for', ranges, ['stmts', [stmt]]]
    }
  / For _ ranges:ranges EOL stmts:statements End  {
      return ['for', ranges, stmts]
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
  = e:expr  { return ['output', e]; }

expr
  = conditional

conditional
  = cond:or _ "?" __ tval:conditional _ ":" __ fval:conditional  {
      return ['cond', cond, tval, fval];
    }
  / or

or
  = head:and
    tail:( _ "||" __ r:and  { return ['or', r]; } )*  {
      return buildBinaryChain(head, tail);
    }

and
  = head:equality
    tail:( _ "&&" __ r:equality { return ['and', r]; } )*  {
      return buildBinaryChain(head, tail);
    }

equality
  = head:relational
    tail:( _ op:Equality __ r:relational { return [op, r]; } )*  {
      return buildBinaryChain(head, tail);
    }

relational
  = head:additive
    tail:( _ op:Relational __ r:additive { return [op, r]; } )*  {
      return buildBinaryChain(head, tail);
    }

additive
  = head:multiplicative
    tail:( _ op:Additive __ r:multiplicative { return [op, r]; } )*  {
      return buildBinaryChain(head, tail);
    }

multiplicative
  = head:interpolation
    tail:( _ op:Multiplicative __ r:interpolation { return [op, r]; } )*  {
      return buildBinaryChain(head, tail);
    }

interpolation
  = head:unary
    tail:( _ "%" __ r:unary { return ['fmt', r]; } )*  {
      return buildBinaryChain(head, tail);
    }

unary
  = op:Unary _ expr:call  {
      return [op, expr];
    }
  / call

call
  = id:Identifier _ args:tuple  {
      return ['call', id, args];
    }
  / member

member
  = expr:tuple _ "." __ elem:Identifier  {
      return ['member', expr, elem];
    }
  / expr:tuple _ "[" __ elem:expr __ "]"  {
      return ['member', expr, elem];
    }
  / tuple

tuple
  = "(" __ elems:elemList __ ")"  {
      return ['tuple', elems];
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
      return ['id', id];
    }

/*!
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

{
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
True   = "true"   !IdentCont
False  = "false"  !IdentCont
LTKwd  = "lt"     !IdentCont
GTKwd  = "gt"     !IdentCont
LTEKwd = "le"     !IdentCont
GTEKwd = "ge"     !IdentCont
ModKwd = "mod"    !IdentCont

ReservedWord = ( Def / From / Import / As / For / In / If / Unless / Else / 
                 End / True / False / LTKwd / GTKwd / LTEKwd / GTEKwd / 
                 ModKwd )

Identifier
  = !ReservedWord id:IdentifierName  {
      return lit(id);
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
      return lit(parseFloat(c + (f ? f : '') + (e ? e : '')));
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

_
  = WS*  {
      return lit(' ');
    }

__
  = s:( WS { return ' '; } / (NL / Comment) { return '\n'; } )*  {
      var res = s.join('');
      if ( !res.length ) {
        return null;
      }
      return res.indexOf('\n') !== -1 ? lit('\n') : lit(' ');
    }

/** Parser *******************************************************************/

module
  = s:statements  { return [lit('im'), s]; }

statements
  = statements:blockStatement*  {
      var results = [];
      for ( var i = 0, len = statements.length; i < len; i++ ) {
        results.push(statements[i][0]);
        if ( statements[i][1] !== null ) {
          results.push([lit('ou'), statements[i][1]]);
        }
      }
      return results;
    }

blockStatement
  = __ s:statementWhitespace ws:__ {
      return [s, ws];
    }
  / __ s:statementNoWhitespace __ {
      return [s, null];
    }

statement
  = statementWhitespace
  / statementNoWhitespace

statementWhitespace
  = htmlComment
  / closeTag
  / openTag
  / exprStatement

statementNoWhitespace
  = defStatement
  / fromStatement
  / forStatement
  / ifStatement

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

htmlComment
  = "<!--" comment:( !("-->") c:Char { return c; } )* "-->"  {
      return [lit('ct'), lit(comment.join(''))];
    }

defStatement
  = Def _ id:Identifier _ params:params? _ ":" __ stmt:statement  {
      return [lit('de'), id, params || [], [stmt]];
    }
  / Def _ id:Identifier _ params:params? __ stmts:statements End  {
      return [lit('de'), id, params || [], stmts];
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
  = From _ id:Identifier __ Import _ imports:importList  {
      return [lit('im'), id, imports];
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
  = For _ ranges:ranges _ ":" __ stmt:statement  {
      return [lit('fr'), ranges, [stmt]];
    }
  / For _ ranges:ranges __ stmts:statements End  {
      return [lit('fr'), ranges, stmts];
    }

ranges
  = start:range cont:( _ "," __ r:range { return r; } )*  {
      return [start].concat(cont);
    }

range
  = id:Identifier _ In _ col:expr  {
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

exprStatement
  = e:expr  { return [lit('ou'), e]; }

expr
  = interpolation

interpolation
  = head:conditional
    tail:( _ "%" __ r:conditional { return [lit('fm'), r]; } )*  {
      return buildBinaryChain(head, tail);
    }

conditional
  = cond:or _ "?" __ tval:conditional __ ":" __ fval:conditional  {
      return [lit('cn'), cond, tval, fval];
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
  = id:Identifier _ args:callArgs  {
      return [lit('ca'), id, args];
    }
  / member

callArgs
  = "(" __ elems:elemList __ ")"  {
      return elems || [];
    }

member
  = head:tuple
    tail:( sel:memberSelector { return [lit('mb'), sel]; } )*  {
      return buildBinaryChain(head, tail);
    }

memberSelector
  = _ "." __ elem:Identifier  {
      return elem;
    }
  / _ "[" __ elem:expr __ "]"  {
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

number
  = Number

string
  = SimpleString
  / MultiLineString

boolean
  = True   { return lit(true); }
  / False  { return lit(false); }

identifier
  = id:Identifier {
      return [lit('id'), id];
    }

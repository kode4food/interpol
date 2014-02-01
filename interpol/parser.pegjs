/*!
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

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

ReservedWord = ( Def / From / Import / As / For / In / If / Else / Case / End )

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
  = "//" (!NLOrEOF Char)* NLOrEOF

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

_
  = WS*

__
  = ( WS / NL / Comment )*

/** Parser *******************************************************************/

module
  = statements

statements
  = ( __ s:statement __ { return s; } )*

statement
  = openTag
  / selfCloseTag
  / closeTag
  / defStatement
  / fromStatement
  / forStatement
  / exprStatement

openTag
  = "<" id:identifier __ attrs:( a:attribute  __ { return a; } )* ">"  {
    return ['open', id, attrs];
  }

selfCloseTag
  = "<" id:identifier __ attrs:( a:attribute  __ { return a; } )* "/>"  {
    return ['self_close', id, attrs];
  }

attribute
  = id:identifier __ "=" __ expr:expr  {
    return ['attr', id, expr];
  }

closeTag
  = "</" id:identifier __ ">"  {
    return ['close', id];
  }

defStatement
  = Def _ id:identifier _ params:params? _ ":" _ stmt:statement EOL  {
    return ['def', id, params, [stmt]]
  }
  / Def _ id:identifier _ params:params? EOL stmts:statements End  {
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
  = start:identifier cont:( _ "," __ id:identifier  { return id; } )*  {
    return [start].concat(cont);
  }

fromStatement
  = From _ id:identifier __ Import _ imports:importList EOL {
    return ['from', id, imports];
  }

importList
  = start:importItem cont:( _ "," __ item:importItem { return item; } )*  {
    return [start].concat(cont);
  }

importItem
  = name:identifier alias:( _ As _ id:identifier { return id; } )?  {
    return [name, alias];
  }

forStatement
  = For _ ranges:ranges _ ":" _ stmt:statement EOL  {
    return ['for', ranges, [stmt]]
  }
  / For _ ranges:ranges EOL stmts:statements End  {
    return ['for', ranges, stmts]
  }

ranges
  = start:range cont:( _ "," __ range )*  {
    return [start].concat(cont);
  }

range
  = id:identifier _ In _ col:expr  {
    return ['range', id, col];
  }

exprStatement
  = e:expr EOL  { return e; }

expr
  = interpolation

interpolation
  = fmt:path _ "%" __ expr:expr  {
    return ['fmt', fmt, expr];
  }
  / path

path
  = expr:atomic _ "." __ elem:identifier  {
    return ['path', expr, elem];
  }
  / expr:atomic _ "[" __ elem:expr __ "]"  {
    return ['path', expr, elem];
  }
  / atomic

atomic
  = call
  / tuple
  / literal

call
  = id:identifier _ args:tuple  {
    return ['call', id, args];
  }

identifier
  = id:Identifier {
    return ['id', id];
  }

tuple
  = "(" __ elems:elemList __ ")"  {
    return ['tuple'].concat(elems);
  }

elemList
  = start:expr cont:( _ "," __ e:expr  { return e; } )*  {
    return [start].concat(cont);
  }

literal
  = string
  / identifier

string
  = str:SimpleString {
    return ['str', str];
  }
  / str: MultiLineString {
    return ['str', str];
  }

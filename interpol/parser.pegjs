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
True   = "true"   !IdentCont
False  = "false"  !IdentCont

ReservedWord = ( Def / From / Import / As / For / In / If / Else / Case / End /
                 True / False )

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
  = s:statements

statements
  = ( __ s:statement __ { return s; } )*  {
    return ['statements'].concat(s);
  }

statement
  = openTag
  / selfCloseTag
  / closeTag
  / htmlComment
  / defStatement
  / fromStatement
  / forStatement
  / exprStatement

openTag
  = "<" id:Identifier __ attrs:( a:attribute  __ { return a; } )* ">"  {
    return ['open', id, attrs];
  }

selfCloseTag
  = "<" id:Identifier __ attrs:( a:attribute  __ { return a; } )* "/>"  {
    return ['sclose', id, attrs];
  }

attribute
  = id:Identifier __ "=" __ expr:expr  {
    return ['attr', id, expr];
  }
  / id:Identifier  {
    return ['attr', id, true];
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
    return ['def', id, params, [stmt]]
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
  = From _ id:Identifier __ Import _ imports:importList EOL {
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
  = id:Identifier _ In _ col:expr  {
    return ['range', id, col];
  }

exprStatement
  = e:expr  { return ['output', e]; }

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
  = id:Identifier _ args:tuple  {
    return ['call', id, args];
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
  / boolean
  / identifier

string
  = str:SimpleString  {
    return str;
  }
  / str: MultiLineString  {
    return str;
  }

boolean
  = True   { return true; }
  / False  { return false; }

identifier
  = id:Identifier {
    return ['id', id];
  }

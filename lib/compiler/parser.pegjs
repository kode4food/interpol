/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

{
  var parser = require('../lib/compiler/parser');
  var buildBinaryChain = parser.buildBinaryChain;
  var hasOperator = parser.hasOperator;
  var changeOperator = parser.changeOperator;
  var interpolation = parser.interpolation;
  var isInterpolation = parser.isInterpolation;
  var isIdentifier = parser.isIdentifier;
  var markStatements = parser.markStatements;

  function symbol(value, type) {
    return {
      value: value,
      type: type,
      line: line(),
      column: column()
    };
  }

  function operator(value) {
    return symbol(value, 'op');
  }

  function literal(value) {
    return symbol(value, 'lit');
  }

  function identifier(value) {
    return symbol(value, 'id');
  }
}

start = module

/* Lexer *********************************************************************/

For    = "for"    !IdentCont  { return operator('fr'); }
Def    = "def"    !IdentCont  { return operator('de'); }
From   = "from"   !IdentCont  { return operator('im'); }
Import = "import" !IdentCont  { return operator('im'); }
Export = "export" !IdentCont  { return operator('ex'); }
Let    = "let"    !IdentCont  { return operator('as'); }
And    = "and"    !IdentCont  { return operator('an'); }
Or     = "or"     !IdentCont  { return operator('or'); }
Like   = "like"   !IdentCont  { return operator('ma'); }
LT     = "lt"     !IdentCont  { return operator('lt'); }
GT     = "gt"     !IdentCont  { return operator('gt'); }
Mod    = "mod"    !IdentCont  { return operator('mo'); }
Self   = "self"   !IdentCont  { return operator('se'); }
Not    = "not"    !IdentCont  { return operator('no'); }
In     = "in"     !IdentCont  { return operator('in'); }
Nil    = "nil"    !IdentCont  { return literal(undefined); }
True   = "true"   !IdentCont  { return literal(true); }
False  = "false"  !IdentCont  { return literal(false); }
If     = "if"     !IdentCont  { return true; }
Unless = "unless" !IdentCont  { return false; }
As     = "as"     !IdentCont
Else   = "else"   !IdentCont
End    = "end"    !IdentCont

/* Stuff with synonyms */
LTE  = ( "le" / "lte" )     !IdentCont  { return operator('le'); }
GTE  = ( "ge" / "gte" )     !IdentCont  { return operator('ge'); }
When = ( "when" / "where" ) !IdentCont
Do   = ( "do" / "with" )    !IdentCont

ReservedWord = ( For / Def / From / Import / Export / Let / And / Or / Like /
                 LT / GT / LTE / GTE / Mod / Self / Not / Nil / If / Unless /
                 True / False / Do / As / In / Else / End / When )

Identifier
  = !ReservedWord id:IdentifierName  {
      return identifier(id);
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

HTMLElementName
  = start:HTMLElementStart cont:HTMLElementCont*  {
      return identifier(start + cont.join(''));
    }

HTMLElementStart
  = [a-zA-Z-]

HTMLElementCont
  = [^\u0000-\u001F'"> \/=]

HTMLAttributeName
  = chars:HTMLAttributeChar+  {
      return identifier(chars.join(''));
    }

HTMLAttributeChar
  = [^\u0000-\u001F'"> \/=]

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
      return 'e' + (s ? s : '+') + d.join('');
    }

Frac
  = "." d:Digit+  {
      return '.' + d.join('');
    }

Number
  = c:Card f:Frac? e:Exp?  {
      return literal(parseFloat(c + (f ? f : '') + (e ? e : '')));
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
      return interpolation(chars.join(''), true);
    }

MLString2
  = "'''" MLTrim? chars:( !MLTail2 c:Char { return c; } )* MLTail2  {
      return interpolation(chars.join(''));
    }

MLTrim
  = WS* NL

MLTail1
  = NL? '"""'

MLTail2
  = NL? "'''"

SimpleString
  = '"' '"'                { return literal(''); }
  / "'" "'"                { return literal(''); }
  / '"' c:DoubleChar+ '"'  { return interpolation(c.join(''), true); }
  / "'" c:SingleChar+ "'"  { return interpolation(c.join('')); }

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

EQ  = "=="  { return operator('eq'); }
NEQ = "!="  { return operator('nq'); }

Add = "+"  { return operator('ad'); }
Sub = "-"  { return operator('su'); }

Mul = "*"  { return operator('mu'); }
Div = "/"  { return operator('di'); }

Neg = "-"  { return operator('ne'); }
Pos = "+"  { return operator('po'); }

Bind = "@"  { return operator('bi'); }

Equality = Like / NEQ / EQ
Relational = GTE / LTE / LT / GT / In
Additive = Add / Sub
Multiplicative = Mul / Div / Mod
Unary = Neg / Pos / Not

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
        if ( ws && ws.length ) {
          results.push([operator('ou'), literal(ws)]);
        }
      }
      return markStatements(results);
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
  / mustacheExpression
  / htmlDocType
  / closeTag
  / openTag

interpolStatement
  = defStatement
  / importStatement
  / forStatement
  / ifStatement
  / assignStatement

htmlComment
  = "<!--" comment:( !("-->") c:Char { return c; } )* "-->"  {
      return [operator('ct'), literal(comment.join(''))];
    }

mustacheExpression
  = "{" m:mustacheExpression "}"  {
      var nested = "{" + m[1].value + "}";
      return [operator('ra'), literal(nested)];
    }
  / "{" content:mustacheContent "}"  {
      return [operator('ra'), literal("{" + content + "}")];
    }

mustacheContent
  = expr:( !("}") c:Char { return c; } )*  {
      return expr.join('');
    }

htmlDocType
  = "<!" DocType _ rootElem:HTMLElementName _ ">"  {
      return [operator('dt'), rootElem];
    }

openTag
  = "<" __ tag:htmlElementName __
    attrs:( a:attribute __ { return a; } )* t:tagTail  {
      return [operator('op'), tag, attrs, t];
    }

htmlElementName
  = "(" __ expr:expr __ ")"  {
      return expr;
    }
  / HTMLElementName

htmlAttributeName
  = "(" __ expr:expr __ ")"  {
      return expr;
    }
  / HTMLAttributeName

tagTail
  = "/>"  { return 1; }
  / ">"   { return 0; }

attribute
  = name:htmlAttributeName value:( _ "=" __ e:expr { return e; } )?  {
      return [name, value === null ? literal(true) : value];
    }

closeTag
  = "</" __ tag:htmlElementName __ ">"  {
      return [operator('cl'), tag];
    }

defStatement
  = op:Def _ id:Identifier _ params:params?
    guard:( __ g:guard { return g; } )?
    statements:statementsTail  {
      params = params || {};
      var guards = params.guards || [];
      var i;
      var len;
      if ( guards.length ) {
        if ( guard ) { guards.push(guard); }
        guard = guards[0];
        for ( i = 1, len = guards.length; i < len; i++ ) {
          guard = [operator('an'), guard, guards[i]];
        }
      }

      if ( guard ) {
        return [op, id, params.ids || [], statements, guard];
      }
      return [op, id, params.ids || [], statements];
    }

guard
  = When _ expr:expr  {
      return expr;
    }

statementsTail
  = ( _ ":" )? __ statements:statements End  {
      return statements;
    }

doParams
  = "|" __ params:doParamList __ "|"  {
    return params;
  }

doParamList
  = start:Identifier
    cont:( _ "," __ id:Identifier  { return id; } )*  {
      return { ids: [start].concat(cont), guards: [] };
    }

params
  = "(" __ params:paramList __ ")"  {
      return params;
    }
  / "(" __ ")"  {
      return null;
    }

paramList
  = start:paramDef
    cont:( _ "," __ param:paramDef  { return param; } )*  {
      var ids = [];
      var guards = [];
      var items = [start].concat(cont);
      for ( var i = 0, len = items.length; i < len; i++ ) {
        var paramDef = items[i];
        var item = paramDef[0];
        if ( isIdentifier(item) ) {
          ids.push(item);
          continue;
        }
        var idSym = paramDef[1] || literal(i);
        ids.push(idSym);
        guards.push([operator('ma'), [operator('id'), idSym], item]);
      }
      return { ids: ids, guards: guards };
    }

paramDef
  = param:Identifier  {
      return [param];
    }
  / param:expr alias:( _ As _ id:Identifier { return id; } )?  {
      if ( alias ) {
        return [param, alias];
      }
      return [param];
    }

importStatement
  = op:From _ path:modulePath __ Import _ imports:moduleItemList  {
      return [op, [[path, imports]]];
    }
  / op:Import _ modules:moduleList  {
      return [op, modules];
    }

modulePath
  = start:moduleComp cont:( "." item:moduleComp { return item; } )*  {
      return operator([start].concat(cont).join('/'));
    }

moduleComp
  = !ReservedWord id:IdentifierName  {
      return id;
    }

moduleItemList
  = start:moduleItem cont:( _ "," __ item:moduleItem { return item; } )*  {
      return [start].concat(cont);
    }

moduleItem
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
  = op:For _ ranges:ranges __ statements:statements tail:elseTail  {
      return [op, ranges, statements, tail];
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
  = op:IfUnless _ expr:expr __ statements:statements tail:elseTail  {
      if ( !op ) {
        return [operator('if'), expr, tail, statements];
      }
      return [operator('if'), expr, statements, tail];
    }

elseTail
  = Else _ ifStatement:ifStatement  {
      return markStatements([ifStatement]);
    }
  / Else __ statements:statements End  {
      return statements;
    }
  / End  {
      return markStatements([]);
    }

assignStatement
  = op:Let _ a:assignments  {
      return [op, a];
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
  = expr:expr  { return [operator('ou'), expr]; }

expr
  = rightCall

rightCall
  = args:conditional calls:( _ "|" __ c:conditional { return c; } )*  {
      if ( calls && calls.length ) {
        // if it starts with an interpolation, we need to feed it 'self'
        if ( isInterpolation(args) ) {
          calls.unshift(args);
          args = [operator('se', args)];
        }
        for ( var i = 0, len = calls.length; i < len; i++ ) {
          args = [operator('ca'), calls[i], [args]];
        }
      }
      else {
        // or if it's an auto interpolation, we also feed it 'self'
        if ( isInterpolation(args) && args.type === 'auto' ) {
          args = [ operator('ca'), args, [[operator('se')]] ];
        }
      }
      return args;
    }

conditional
  = tval:or _ op:IfUnless __ cond:or __ Else __ fval:conditional  {
      if ( !op ) {
        return [operator('cn'), cond, fval, tval];
      }
      return [operator('cn'), cond, tval, fval];
    }
  / or

or
  = head:and
    tail:( _ op:Or __ r:and  { return [op, r]; } )*  {
      return buildBinaryChain(head, tail);
    }

and
  = head:equality
    tail:( _ op:And __ r:equality { return [op, r]; } )*  {
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
  = head:unary
    tail:( _ op:Multiplicative __ r:unary { return [op, r]; } )*  {
      return buildBinaryChain(head, tail);
    }

unary
  = op:Unary _ expr:unary  {
      var opValue = op.value;
      if ( opValue === 'no' || !isInterpolation(expr) || expr.marked ) {
        return [op, expr];
      }

      if ( opValue === 'ne' || opValue === 'po' ) {
        expr.type = opValue === 'ne' ? 'int' : 'auto';
        expr.marked = true;
        return expr;
      }

      // should not have gotten here
      expected("unary operator of '+' or '-'");
    }
  / callBinder

callBinder
  = op:Bind _ listInt:listInterpolation  {
      if ( !hasOperator(listInt, 'ca') ) {
        expected("bind to target a function or partial call");
      }
      return changeOperator(listInt, 'bi');
    }
  / listInterpolation

listInterpolation
  = str:string _ list:listNoParens  {
      return [ operator('ca'), str, [list] ];
    }
  / member

member
  = head:list
    tail:( _ sel:memberSelector { return sel; } )*  {
      return buildBinaryChain(head, tail);
    }

memberSelector
  = "." __ elem:Identifier  {
      return [operator('mb'), [literal(elem.value)]];
    }
  / "[" __ elem:expr __ "]"  {
      return [operator('mb'), [elem]];
    }
  / args:callArgs  {
      return [operator('ca'), args];
    }

callArgs
  = "(" __ elems:elemList __ ")" doTail:doTail?  {
      if ( doTail ) {
        elems.push(doTail);
      }
      return elems;
    }
  / "(" __ ")" doTail:doTail?  {
      return doTail ? [doTail] : [];
    }
  / doTail:doTail  {
      return [doTail];
    }

doTail
  = _ Do __ params:doParams? statements:statementsTail  {
      params = params || {};
      return [operator('de'), null, params.ids || [], statements];
    }

list
  = listNoParens
  / parens

listNoParens
  = "[" __ comp:listComprehension __ "]"  {
      return comp;
    }
  / "[" __ elems:elemList __ "]"  {
      return [operator('ar'), elems];
    }
  / "[" __ elems:dictAssignments __ "]" {
      return [operator('dc'), elems];
    }
  / "[" __ "]"  {
      return [operator('ar'), []];
    }

dictAssignments
  = start:dictAssignment cont:( _ "," __ a:dictAssignment { return a; } )*  {
      return [start].concat(cont);
    }

dictAssignment
  = name:Identifier _ "=" __ value:expr  {
      return [name, value];
    }
  / name:expr _ ":" __ value:expr  {
      return [name, value]
    }    

listComprehension
  = vectorComprehension
  / dictComprehension

vectorComprehension
  = expr:expr __ op:For __ ranges:ranges  {
      return [operator('lc'), ranges, expr];
    }

dictComprehension
  = assign:dictAssignment __ op:For __ ranges:ranges  {
      return [operator('lc'), ranges, assign[1], assign[0]];
    }

elemList
  = start:expr cont:( _ "," __ e:expr  { return e; } )*  {
      return [start].concat(cont);
    }

parens
  = "(" __ expr:expr __ ")"  {
      return expr;
    }
  / literal

literal
  = defExpr
  / number
  / string
  / boolean
  / identifier
  / self
  / nil

defExpr
  = op:Def _ params:params statements:statementsTail  {
      console.log("should not have recognized this yet");
      return [op, null, params.ids || [], statements];
    }

number
  = Number

string
  = MultiLineString
  / SimpleString

boolean
  = True
  / False

identifier
  = id:Identifier  {
      return [operator('id'), id];
    }

self
  = op:Self  {
      return [op];
    }

nil = Nil

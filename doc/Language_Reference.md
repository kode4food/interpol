# Interpol Language Reference

## Case Sensitivity
Interpol is case-sensitive, meaning any of the keywords and identifiers must appear in the same case by which they're represented either in this document or in the JavaScript data being passed to Interpol.  All Interpol keywords are lower-case, while JavaScript identifiers may be supplied in mixed case.

## New Lines
Interpol templates are partially NewLine sensitive.  Specifically, new lines are used to delimit certain grammatical constructs, particularly the conclusion of statements and expressions.  So for example, these are all legal statements:

```python
(10,
12, 13,
19, 20)

5 -
2

for person in people,
    sibling in person.siblings
  displaySibling(person, sibling)
end
```

While these are invalid:

```python
(10
, 12, 13
, 19, 20)

5
- 2

for person in people
  , sibling in person.siblings displaySibling(person, sibling)
end
```

One thing worth mentioning is that the `5 - 2` expressions won't raise a parsing error because both are legal sets of expression statements.  The first will display the expected result of `3`, while the second will display two lines containing `5` and `-2`.

## Comments
Interpol supports two forms of comments, HTML comments and End-of-Line Comments.  They behave differently, and this difference is important to understand.  HTML comments are passed all the way through the template processor and into the browser.  End-of-Line Comments are discarded by the Interpol parser.

HTML Comments, you might remember, look like this:

```html
<!-- I'm an HTML Comment! -->
```

While End-of-Line Comments start with a hash `#` and extend to the end of the current line in the template.

```python
# Loop over the brothers of everyone
for person in people, brother in person.brothers
  renderItem(person, brother)  # Render it!
end
```

## Statements

### Partial Definitions
Partials are reusable procedures that can be applied in a variety of contexts, such as in loops and conditionals.  For example, one might write a partial to render a single item in a list:

```python
def renderItem(person, brother)
  <li>
    "% is the brother of %" % (brother, person.name)
  </li>
end
```

Partials are first-class elements of Interpol, meaning they can be passed around and assigned to variables.  In certain situations, they are also hoisted to the top of their scope, so you can call them in your code even before they've been defined.

### Importing
Importing partials and variables in Interpol is similar to Python.  One can either import an entire module as a single variable, or can cherry-pick individual properties.  In all cases, the imported items can be aliased locally.

#### Importing Entire Modules
When an entire module is imported, it will be stored as a single local Object variable whose name (unless aliased) is the last component of its module path.

```python
import dir.subdir.module1  # will import as 'module1'

import dir.subdir.module1, dir.subdir.module2

import dir.subdir.module1 as myModule  # will import as `myModule`

import dir.subdir.module1 as mod1,
       dir.subdir.module2 as mod2
```

When you've imported an entire module, you have to address its partials or variables via membership paths:

```python
import dir.subdir.module1 as myModule
myModule.myPartial("Hello")
```

#### Cherry-Picking Items
When cherry-picking, only the imported items will be placed in the local scope, the module itself will be discarded.

```python
from dir.subdir.module1 import myVariable

from dir.subdir.module1 import myVariable as myVar

from dir.subdir.module1 import myVariable, myPartial as partial1
partial1("Hello")
```

### For Loops
For loops allow one to recursively iterate over sets of items.  For example:

```python
for person in people, brother in person.brothers
  renderItem(person, brother)
end
```

Since there is only one statement in the block, this could have also been written:

```python
for person in people, brother in person.brothers: renderItem(person, brother)
```

In both cases, the outer loop iterates over all elements in `people`, assigning the identifier `person` to each element.  For each `person` item, an inner loop is executed that iterates over the person's `brothers` property, assigning the identifier `brother` to each element.  You'll notice that `person` is available in the inner loop's scope and that both identifiers are available in the statement block.

### If / Else Branching
Like in most programming languages, Interpol supports conditional branching in the form of If/Else statements.  In its simplest form, it wouldn't include an `else` block and might look like this:

```python
if person.name == 'Curly'
  "Curly was awesome!"
end
```

If the condition is not met, you can also branch to an `else` block:

```python
if person.name == 'Curly'
  "Curly was awesome!"
else
  "This stooge was not so great"
end
```

`else` immediately followed by `if` is treated specially in that it doesn't require a nested `end` keyword.

```python
if person.name == 'Curly'
  "Curly was awesome!"
else if person.name == 'Shemp'
  "Ok, Shemp was alright"
else
  "This stooge was not so great"
end
```

*Note:* The `unless` keyword is syntactic sugar that can be used in place of `if !`.  Its purpose is to implicitly negate the condition.  So `if !happy` becomes `unless happy`.

### HTMLish Elements
HTMLish elements allow HTML tags to be constructed using inlined expressions.  The nicest thing about this is that in many cases, these expressions end up looking *exactly* like normal HTML.  For example:

```html
<div id="parent" class="listItem">
```

This seems like raw HTML, but in fact both id and class are evaluating expressions for their values.  It just so happens that double and single-quoted strings are valid expressions in Interpol, so everything works out great.  But what if you want to augment the class attribute dynamically?

```
<div id="parent" class="listItem " + otherClasses>
```

In this case, the value of the class attribute will be computed dynamically from the expression `"listItem " + otherClasses`.

You can also compute the name of a tag or attribute dynamically by enclosing the expression in a single-element tuple).  For example:

```
<(theTagName) id="parent" (theAttrName || "class")="listItem " + otherClasses>
```

HTMLish elements *do not* create nested scopes and are not paired semantically into single statement blocks.  In fact, a closing element is not required at all.  Therefore, code like this will yield incorrect results:

```python
if person.name == 'Curly': <strong>"Curly is awesome!"</strong>
```

Interpol will only treat the initial `<strong>` tag as part of the `if` statement.  Instead, the statement would have to be formed as follows:

```python
if person.name == 'Curly'
  <strong>"Curly is awesome!"</strong>
end
```

### Expression Statements
Any expression that is not evaluated in the context of another statement, such as in a For loop or If / Else statement, is considered to be an Expression Statement.  It will be evaluated and its result will be streamed to the template's output.  For example:

```python
"% out of % doctors agree: smoking causes smoke" % (9, 10)
```

Is a single expression that performs an interpolation.  Additionally, sequential Expression Statements require no special delimiting:

```python
18/2 "out of" 5*2 "doctors agree:" "smoking causes smoke"
```

These five expressions, like the one before, will display:

```
9 out of 10 doctors agree: smoking causes smoke
```

## Expressions
Expressions are the building blocks of Interpol statements.  This section outlines the available expression operators, listing them from highest (literals) to lowest (interpolation) precedence.

### Literals

#### Strings
Interpol provides two string types: Simple Strings and Multi-Line Strings.  Simple Strings are like what you've come to expect in JavaScript.  Multi-Line Strings are an idea taken from Python.  All strings can be delimited using either single `'` or double `"` quotes.

##### Simple Strings
Simple Strings are a sequence of characters surrounded by either a set of single quotes or a set of double quotes.  Simple strings may not contain NewLines:

```javascript
'this is a simple string'

"Clearly Curly was the best Stooge"
```

##### Multi-Line Strings
Multi-Line Strings are a sequence of characters surrounded by either a set of three single quotes or a set of three double quotes.  Multi-Line strings, as you may have guessed, may contain NewLines:

```python
''' Everything from here to
there is part of the string '''

"""
This is a long string spanning over multiple lines.  Interpol will
strip any leading whitespace on the first line, as well as any trailing
whitespace on the last line.
"""
```

#### Numbers
Just like JavaScript Numbers.  They look like this:

```javascript
1653
0.59
13.95e+7
```

#### Boolean
`true` or `false`.  It doesn't get any simpler than this.

#### Identifiers
No different than JavaScript identifiers, otherwise you wouldn't be able to pull properties.  These are valid identifiers:

```javascript
foo15
$someIdentifier
_my_id_
```

A special identifier exists called `self` that returns the current evaluation context.

### Tuples
Tuples are like Arrays, except that they're not.  A single element tuple is automatically exposed as an atomic Object, whereas a tuple with more than one element is exposed as an Array.  Fortunately, Interpolation (their primary use case) doesn't care about the difference.

```python
(1 + 8)      # this is treated just like the literal number 9
(5, 9 + 12)  # this is treated like the array [5, 21]
```

### Membership
Like in JavaScript, membership expressions allow you to drill into an object's properties or elements.

```javascript
myList[0]
myList[someIndex || 0]
myObject.someProperty
myObject['someProperty']
```

### Partial Calls
Like a function call in JavaScript, except that most of the time you can't rely on the return value to be anything useful.

```python
for item in list
  renderItem(item)
end
```

### Unary Operators
Only two unary operators are supported.  They are `-` for numeric negation, and `!` for boolean *not* negation.

```javascript
-transactionAmount
!happy
```

### Multiplicative
The multiplicative operators are `*`, `/`, and `mod` (modulo)

### Additive
The additive operators are `+` and `-`.

### Relational
The relational operators are `lt` (less than), `le` (less than or equal), `gt` (greater than), and `ge` (greater than or equal).  Sorry, I would have allowed the traditional characters (`<`, `>` and so on) but the parser would have to be far more clever in order to deal with HTMLish Statements.

### Equality
The equality operators are `==` (equal to) and `!=` (not equal to).

### And
The and `&&` operator performs a boolean *and* between the two operands, short circuiting if the left operand does not evaluate to JavaScript *truthy*.

### Or
The or `||` operator performs a boolean *or* between the two operands, short circuiting if the left operand evaluates to JavaScript *truthy*.

### Conditional (Ternary)
The conditional or ternary operator `?:` works just as you would expect from JavaScript or C.  It will evaluate the first operand, and depending on whether that evaluation is JavaScript *truthy* it will return the evaluation of the second or third operand.

```javascript
happy ? "you are happy!" : "awwwwwww"
```

### Interpolation
Quite simply, interpolation allows you to parameterize a string.  This is accomplished via the interpolation operator `%`.  Interpolation can be performed by index (both implicit and explicit) and by name.

#### Indexed Interpolation (Implicit)
In its most basic form, you'd be merging a single parameter into a string.  This can be done using implicit indexing.

```python
"There are % stooges" % people.length
```

If you have more than one parameter, you need to provide a tuple to the right side of the operator:

```python
"There are % stooges, and % is the best" % (people.length, people.best)
```

#### Indexed Interpolation (Explicit)
In truth, the implicit approach is rather limited, particularly since you could accomplish the same thing with multiple Expression Statements.  Where interpolation becomes important is when you're trying to localize an application and you need to parameterize a string from an expression on the left side of the operator.  Let's say you have the following string table called `str`:

```json
{
  "en": {
    "stooge_summary": "There are % stooges, and % is the best"
  },
  "de": {
    "stooge_summary": "Es gibt % Stooges und % ist die beste"
  }
}
```

You could perform interpolation against an entry in the table by doing the following:

```python
str[lang]['stooge_summary'] % (people.length, people.best)
```

If your parameters always appear in the same order, then the simple `%` characters embedded into the strings will work fine.  But what if the ordering is not consistent?  Then you have to explicitly identify the index of the parameter you'd like to use, keeping in mind that they're 1-based:

```json
{
  "en": {
    "stooge_summary": "%2 is the best of the %1 Stooges"
  },
  "de": {
    "stooge_summary": "Es gibt %1 Stooges und %2 ist die beste"
  }
}
```

#### Named Interpolation
Rather than simple values or tuples, an object can be passed to the right side of the interpolation operator.  This will allow you to interpolate its properties by name.  To do this, follow the embedded `%` by a valid Interpol identifier:

```python
"There are %length stooges" % people
```

Here, the `length` property of `people` will be interpolated into the resulting string.

#### Automatic Interpolation
Automatic Interpolation is supported for literal strings containing named indexing.  The value used in this interpolation is retrieved from the current scope.  So far example, if there is a variable called `name` in the current scope, you can expose it as follows:

```python
"User Profile - %name"
```

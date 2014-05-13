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
Partials are reusable procedures that can be applied in a variety of contexts, such as in loops and conditionals.  For example, one might write a partial to render a list of items:

```python
def renderItem(items)
  <ul>
    for item in items
    <li>
      "%name is the name of the item" % item
    </li>
    end
  </ul>
end
```

The definition of a partial can also be 're-opened' to apply guard clauses, or to shadow the partial if no guard clause is provided.  The order in which partials are defined determines the order in which the guard clauses are evaluated, where the most recently defined will be evaluated first.  For example:

```python
def renderList(people)
  <ul>
  for person in people, sibling in person.siblings
    renderItem(person.name, sibling)
  end
  </ul>
end

def renderList(people) when !people.length
  <b>"There are no people to render!"</b>
end

renderList(people)
```

In this case, if `people` was an empty array, the second variation of renderList would be executed.  Otherwise control would fall-through to the first.  If the unguarded version of renderList had been defined last, it would shadow the previous definition, thus short-circuiting its possible evaluation.

Partials are first-class elements of Interpol, meaning they can be passed around and assigned to variables.  In certain situations, they are also hoisted to the top of their scope, so you can call them in your code even before they've been defined.

*Note:* When invoked, a partial always returns `undefined`.

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

You can also define an `else` clause for those cases where the for loop finds no matches:

```python
for person in people, brother in person.brothers
  renderItem(person, brother)
else
  "I got nothin'!"
end
```

This becomes especially important if you apply guards to your ranges:

```python
for person in people when person.type == 'stooge',
    brother in person.brothers when brother.living
  renderItem(person, brother)
else
  "I got nothin'!"
end
```

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
<div id="parent" class="listItem %otherClasses">
```

In this case, the value of the class attribute will be computed dynamically from the expression `"listItem %otherClasses"`.

You can also compute the name of a tag or attribute dynamically by enclosing the expression in a single-element list).  For example:

```
<(theTagName) id="parent" (theAttrName or "class")="listItem %otherClasses">
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

There are two special identifiers.  The first is called `self` and it returns the current evaluation context.  The second is called `nil` and I think you can guess what that returns.

### Lists
Lists are a sequence of like elements surrounded by parentheses `()` and separated by commas `,`.  The elements therein are either all individual expressions or all name/value pairs.  Lists created in Interpol are immutable.

#### Expressions
An expression list with only a single element is treated simply as a precedence override and is exposed as the enclosed expression.  A list with more than one element is exposed as an Array.  Fortunately, Interpolation (their primary use case) doesn't care about the difference.  You can force a single element Array by ending your list definition with a comma:

```python
(1 + 8)      # this is treated just like the literal number 9
(1 + 8,)     # this is treated like the array [9]
(5, 9 + 12)  # this is treated like the array [5, 21]
```

#### Name/Value Pairs
Name/Value Lists are always exposed as a Dictionary.  The name must be a valid identifier, while the value is any valid expression.

```python
(
  theMachine = 'Deep Thought',
  theAnswer = (28 - 7) * 2
)
# Treated like a dictionary { theMachine: 'Deep Thought', theAnswer: 42 }
```

### Membership
Like in JavaScript, membership expressions allow you to drill into an object's properties or elements.

```javascript
myList[0]
myList[someIndex or 0]
myObject.someProperty
myObject['someProperty']
```

### Function and Partial Binding
Interpol supports a binding operator `@`.  This is a special unary operator that allows you to perform argument binding on both functions and partials.  This is useful against functions for currying in piped calls.  For Example:

```python
from list import join
let j = @join(nil, " -- ")
let a = ('joined','with','dashes')
"Result is %a|j"
```

*Note:* For currying, we use a nil placeholder for the first (piped) argument since that will be overridden by the pipe `|` operator.

Binding is also useful against partials when you want to pass them around for later invocation:

```python
from layouts import mainLayout
from partials import renderList
let renderItems = @renderList(items)
mainLayout("A Title", renderItems)
```

Now, if mainLayout invokes `renderItems()` with no parameters, the bound list in `items` will be rendered.

### Function and Partial Calls
Like a function call in JavaScript.  A library function will either produce some template output or return a value, depending on its purpose.  A partial will aways returned `undefined`.

```python
for item in list
  renderItem(item)
end
```

### Piped Calls
A piped call is an operator where the left operand is passed as the sole argument to the right operand.  The right operand must evaluate to a callable function.  These calls can be chained from left to right, where the result of each call is passed into the next right-hand operand.

```python
from list import join
from string import title
classes | join | title
```

### Unary Operators
Only two traditional unary operators are supported.  They are `-` for numeric negation, and `not` for boolean *not* negation.

```python
-transactionAmount
not happy
```

### Multiplicative
The multiplicative operators are `*`, `/`, and `mod` (modulo)

### Additive
The additive operators are `+` and `-`.

### Relational
The relational operators are `lt` (less than), `le` (less than or equal), `gt` (greater than), and `ge` (greater than or equal).  Sorry, I would have allowed the traditional characters (`<`, `>` and so on) but the parser would have to be far more clever in order to deal with HTMLish Statements.

### Equality
The three equality operators are `==` (equal to), `!=` (not equal to) and `like` (compatible with).

The `like` operator was introduced to support inline guards, but is generally useful.  Like will perform a deep comparison of values to determine whether the left operand is 'compatible' with the template on the right.

Compatibility is mostly as you would expect, with one exception.  If the template contains an Object, only the properties defined in that Object are checked.  If the left operand has additional properties, those are ignored.

### And
The and `and` operator performs a boolean *and* between the two operands, short circuiting if the left operand does not evaluate to JavaScript *truthy*.

### Or
The or `or` operator performs a boolean *or* between the two operands, short circuiting if the left operand evaluates to JavaScript *truthy*.

### Conditional (Ternary)
The conditional or ternary operator works just as you would expect from Python.  It will evaluate the first operand if the condition is met (or not met in the case of `unless`), otherwise it will return the evaluation of the third operand.

```python
# <true_value> if <condition> else <false_value>
"you are happy!" if happy else "awwwwwww"

# <false_value> unless <condition> else <true_value>
"awwwwwww" unless happy else "you are happy!"
```

### Interpolation
Quite simply, interpolation allows you to parameterize a string.  This is accomplished via the interpolation operator `%`.  Interpolation can be performed by index (both implicit and explicit) and by name.

#### Indexed Interpolation (Implicit)
In its most basic form, you'd be merging a single parameter into a string.  This can be done using implicit indexing.

```python
"There are % stooges" % people.length
```

If you have more than one parameter, you need to provide a list to the right side of the operator:

```python
"There are % stooges, and % is the best" % (people.length, people.best)
```

#### Indexed Interpolation (Explicit)
In truth, the implicit approach is rather limited, particularly since you could accomplish the same thing with multiple Expression Statements.  Where interpolation becomes important is when you're trying to localize an application and you need to parameterize a string from an expression on the left side of the operator.  Let's say you have the following string table called `str`:

```python
let str = (
  en=(
    stooge_summary='There are % stooges, and % is the best'
  ),
  de=(
    stooge_summary='Es gibt % Stooges und % ist die beste'
  )
)
```

You could perform interpolation against an entry in the table by doing the following:

```python
str[lang].stooge_summary % (people.length, people.best)
```

If your parameters always appear in the same order, then the simple `%` characters embedded into the strings will work fine.  But what if the ordering is not consistent?  Then you have to explicitly identify the index of the parameter you'd like to use, keeping in mind that they're 1-based:

```python
let str = (
  en=(
    stooge_summary='%2 is the best of the %1 Stooges'
  ),
  de=(
    stooge_summary='Es gibt %1 Stooges und %2 ist die beste'
  )
)
```

#### Named Interpolation
Rather than simple values or lists, an object can be passed to the right side of the interpolation operator.  This will allow you to interpolate its properties by name.  To do this, follow the embedded `%` by a valid Interpol identifier:

```python
"There are %length stooges" % people
```

Here, the `length` property of `people` will be interpolated into the resulting string.

#### Automatic Interpolation
Automatic Interpolation is supported for double-quoted literal strings containing named indexing.  If a string has single quotes or does not perform named interpolation, it will be treated as a literal.

The value used in this interpolation is retrieved from the current scope.  So for example, if there is a variable called `name` in the current scope, you can expose it as follows:

```python
"User Profile - %name"
```

#### Piped Interpolation
The Interpolation feature also supports a restricted form of the piped call operator.  The restrictions in using this method are that the pipe character *can not* be surrounded by spaces and the right-hand operands can only be identifiers.  For example:

```python
from string import title
"User Profile - %name|title"
```

## System Modules

### list
Provides functionality for manipulating lists.

#### first(array)
Returns the first item of the provided array (or `null` if the array is empty).

#### last(array)
Returns the last item of the provided array (or `null` if the array is empty).

#### length(value)
If it is an array, returns the length of the provided value (otherwise `0`).

#### join(array, delimiter)
Return the result of joining the elements of the provided array.  Each element will be concatenated into a string separated by the specified delimiter (or ' ').

#### empty(array)
Returns true or false depending on whether or not the provided array is empty.

#### keys(value)
Returns the keys of the Object or indexes of the Array passed to it.  If the Array is sparse (has gaps) it will only return the indexes with assigned values.

### string
Provides functionality for manipulating strings.

#### lower(string)
Converts the provided string to lower-case and returns the result.

#### upper(String)
Converts the provided string to upper-case and returns the result.

#### title(string)
Converts the provided string to title-case and returns the result.  Title case converts the first character of each word to upper-case, and the rest to lower-case.

#### split(string, delimiter)
Splits the provided string wherever the specified delimiter (or whitespace) is encountered and returns the result.

#### string(value)
Converts the provided value to a string and returns the result.

### math
Provides basic mathematical functions and constants.

#### Constants
* E - Euler's Number
* LN2 - Natural Logarithm of 2
* LN10 - Natural Logarithm of 10
* LOG2E - Base-2 Logarithm of E
* LOG10E - Base-10 Logarithm of E
* PI - Pi
* SQRT1_2 - The Square Root of 1/2
* SQRT2 - The Square Root of 2

#### abs(number)
Returns the absolute value of the provided number.

#### acos(number)
Returns the arc-cosine of the provided number (in radians).

#### asin(number)
Returns the arc-sine of the provided number (in radians).

#### atan(y, x)
Returns the arc-tangent of the provided number (in radians).

#### atan2(number)
Returns the arc-tangent of the provided coordinates.

#### avg([number])
Returns the average of the numbers in the provided array.

#### ceil(number)
Rounds the provided number upward to the nearest integer and returns the result.

#### cos(number)
Returns the cosine of the provided number (in radians).

#### exp(x)
Returns E to the power of x, where E is Euler's number.

#### floor
Rounds the provided number downward to the nearest integer and returns the result.

#### log(number)
Returns the natural logarithm of the provided number.

#### max([number])
Returns the maximum value among the numbers in the provided array.

#### median([number])
Returns the mathematical median of the numbers in the provided array.

#### min([number])
Returns the minimum value among the numbers in the provided array.

#### pow(x, y)
Returns x raised to the power of y.

#### random()
Returns a random number between 0 (inclusive) and 1 (exclusive).

#### round(number)
Rounds the provided number to the nearest integer and returns the result.

#### sin(number)
Returns the sine of the provided number (in radians).

#### sqrt(number)
Returns the sqaure root of the provided number.

#### sum([number])
Returns the sum of the numbers in the provided array.

#### tan(number)
Returns the tangent of the provided number (in radians).

#### number(value)
Converts the provided value to a number and returns the result (or NaN).

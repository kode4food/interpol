---
title: A Guide to Interpol
layout: interpol_guide
prev: 04-interpolation
next: 06-looping
---
## Logical Branching

### if / unless /else
Like in most programming languages, Interpol supports conditional branching in the form of If/Else statements.  The expression provided to `if` is evaluated using Interpol's *truthy* rules.  In its simplest form, it wouldn't include an `else` block and might look like this:

```ruby
if person.name == 'Curly'
  "Curly was awesome!"
end
```

If the condition is not met, you can also branch to an `else` block:

```ruby
if person.name == 'Curly'
  "Curly was awesome!"
else
  "This stooge was not so great"
end
```

`else` immediately followed by `if` is treated specially in that it doesn't require a nested `end` keyword.

```ruby
if person.name == 'Curly'
  "Curly was awesome!"
else if person.name == 'Shemp'
  "Ok, Shemp was alright"
else
  "This stooge was not so great"
end
```

*Note:* The `unless` keyword is syntactic sugar that can be used in place of `if not`.  Its purpose is to implicitly negate the condition.  So `if not happy` becomes `unless happy`.

### Conditionals
The conditional or ternary operator works just as you would expect from Python.  It will evaluate the first operand if the condition is met (or not met in the case of `unless`), otherwise it will return the evaluation of the third operand.

```ruby
# <true_value> if <condition> else <false_value>
"you are happy!" if happy else "awwwwwww"

# <false_value> unless <condition> else <true_value>
"awwwwwww" unless happy else "you are happy!"
```

### Truthy and Falsy
Interpol conditionals always test whether an expression is 'truthy' or 'falsy'.  So you don't generally have to compare expressions directly to `true` or `false`.  In fact, you should only do so if you're expecting the actual value, as Interpol's equality operators are rather strict.

In Interpol 'truthy' is any value that matches the following criteria:

  * Vectors with at least one element
  * Dictionaries with at least one pair
  * Strings with at least one character
  * The boolean 'true'
  * Non-Zero Numbers

Falsy is any value that is not 'truthy'.

### Boolean Operators (or, and)
This concept of 'truthy' also applies to the Boolean Operators.

#### Or
In boolean logic, the `or` operator basically states that one or the other operand must be true.  In Interpol, it's implemented by testing the left operand for 'truthiness'.  If it matches, then it will be returned.  Otherwise the right operand will be returned.

#### And
In boolean logic, the `and` operator basically states that both operands must be true.  In Interpol, it's implemented by testing the left operand for 'truthiness'.  If it matches, then the right operand will be returned.  Otherwise the left operand will be returned.

### Equality Operators (==, !=, like)
The `==` and `!=` operators perform strict equality checking, identical to JavaScript's `===` and `!==` operators.

```ruby
1 == '1'  # results in false
1 != '1'  # results in true
```

#### Like
The `like` operator is a little different.  Like will perform a deep comparison of values to determine whether the left operand is 'compatible' with the template on the right.

Compatibility is mostly as you would expect, with one exception.  If the template contains a dictionary, only the properties defined in that dictionary are checked.  If the left operand has additional properties, those are ignored.

```ruby
let myObject = [
  name = 'Fred',
  occupation = 'developer',
  age = 42,
  company = 'ACME Software'
]

if myObject like [occupation='developer', age=42]
  'YEP!'
end
```

### Relational Operators (lt, lte, gte, gt)
The relational operators are `lt` (less than), `le` (less than or equal), `gt` (greater than), and `ge` (greater than or equal).  Sorry, I would have allowed the traditional characters (`<`, `>` and so on) but the parser would have to be far more clever in order to deal with HTMLish Statements.


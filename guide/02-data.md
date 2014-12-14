---
title: A Guide to Interpol
layout: interpol_guide
prev: 01-intro
next: 03-html
---
## Data in Interpol
Interpol is designed to consume JSON, meaning that it will work well if you provide JavaScript Object graphs that could otherwise easily serialize to JSON.  Once you start adding prototypal inheritence and such, all bets are off.  Interpol will also ignore Functions in the data unless they're specially blessed as being Interpol-compatible.

### What are Context and Scope?
A context is the Object that you provide to Interpol to be incorporated into a template.  By Object, we mean Object.  Arrays and other value types will not be accepted, that is unless you wrap them in an Object.  For example, this is a potential context:

```javascript
var myContext = { 
  "name": "Fred",
  "age": 69,
  "spouse": {
    "name": "Ethel",
    "age": 47
  },
  "friends": [
    {
      "name": "Ricky",
      "age": 39,
      "spouse": {
        "name": "Lucy",
        "age": 45
      }
    }
  ]
};
```

Now let's say you pass `myContext` into an Interpol template for processing. Since your initial scope would be the context itself, a template like this:

```ruby
"%name was %age"
```
<a class="jsfid" href="http://jsfiddle.net/kode4food/yB336/">JSFiddle</a>

Would display:

```html
Fred was 69
```

The variables would be resolved directly from the provided context.

#### A Question of Scope
In order to avoid surprises, for any template or module, Interpol will never change its context during processing.  Instead, it will create new scopes and will introduce variables into those.  Those variables only exist for the duration of that scope.  So if you were to loop over Fred's friends, given your previous templating experience, you might expect this:

```ruby
for friend in friends
  "%name was %age"
end
```
<a class="jsfid" href="http://jsfiddle.net/kode4food/9pCzE/">JSFiddle</a>

To display this:

```
Ricky was 39
```

**But it doesn't!**  So why does Interpol continue to display "Fred was 69"?  Because it is not switching to a new context.  Instead it's creating a new scope and introducing a new variable to that scope (friend).  But `name` and `age` are being resolved from the previous scope because scopes are nested.  You can correct this like so:

```ruby
for friend in friends
  friend | '%name was %age'
end
```
<a class="jsfid" href="http://jsfiddle.net/kode4food/JsLPZ/">JSFiddle</a>

Now `name` and `age` will be resolved from the `friend` variable in the current scope.

    By the way, now you've seen some Interpol keywords.  Specifically you've seen three of the keywords required to create a loop (for, in, and end).  Looping will be discussed later in this Guide.  You've also seen Interpolation in action.  That will also be discussed later in the Guide.

### Reserved Words
Interpol reserves the following identifiers as keywords:

    and, as, def, else, end, export, false, for, from, gt, gr, gte, if, import, in, let, like, lt, le, lte, mod, nil, not, or, self, true, unless, when, where

Attempting to assign values to these keywords, or to retrieve them as variables, will result in parsing errors.

### Literals
Literals are values expressed in terms of themself, rather than by variable references.  So for example, if I talked about a variable `name` I would really be talking about whatever it is that name refers to.  In the case of Literals, they *are* the values.  Some might refer to literals as fixed, or atomic.  Examples of Literals might include: 3.14, 'Hello, World', and false.

#### Numbers
Numeric Literals in Interpol can only be represented as either real or integers, and only as decimals.  The following are acceptable numeric literals:

```ruby
0
103
99.995
19.123e12
5.32e-5
```

#### Strings
Strings are a series of characters (letters and so on).  Interpol provides two ways to represent strings: simple and multi-line.

A simple string starts and ends with a single quote, and does not break across multiple lines:

```ruby
'This is a simple string'
```

A multi-line string starts and ends with a triple-quote (''') and may include line breaks:

```ruby
'''
This
string
spans
multiple
lines
'''
```

##### Escaping
Strings allow special characters to be included using an escaping method (a leading backslash `\`).  These characters are ones that would be difficult to represent as part of the string, such as a single quote or an embedded newline.

| Escape | Description        |
|:------:| ------------------ |
| \\\    | A single backslash |
| \"     | A double quote     |
| \'     | A single quote     |
| \b     | Bell               |
| \f     | Form-Feed          |
| \n     | Unix Newline       |
| \r     | Carriage Return    |
| \t     | Tab                |

#### Booleans
The value of a Boolean literal is either true or false, so that's how you write them: `true` or `false`.

#### Nil
`nil` is how one would represent the absence of a value.  Interpol coerces any JavaScript `null` or `undefined` value that it sees into a Nil.

#### Self
`self` refers to the current scope.  There are two good reasons for this keyword.  First is that one can retrieve values from the provided context that may not adhere to Interpol's identifier naming requirements.  Second is that the current scope can be passed into a Partial, Function, or Interpolation as a parameter.

### Identifiers
An Identifier is a name that can be used to retrieve a variable or member.  Interpol Identifiers must start with one of the following characters: (a-zA-Z_$).  All characters thereafter may also include digits: (0-9).  Identifiers can not be any of the Interpol reserved words.

### Operators
#### Additive (+, -)
The additive operators are `+` and `-`.

#### Multiplicative (*, /)
The multiplicative operators are `*`, `/`, and `mod` (modulo)

#### Unary (-, not)
Only two traditional unary operators are supported.  They are `-` for numeric negation, and `not` for boolean *not* negation.

```ruby
-transactionAmount
not happy
```

#### Precedence Override
You can override the precedence by which expressions are evaluated by enclosing those expressions in parentheses `()`:

```ruby
(28 - 7) * 2
```

### Lists
Lists are a sequence of like elements surrounded by square braces `[]` and separated by commas `,`.  The elements therein are either all individual expressions (vectors) or all name/value pairs (dictionaries).  Lists created in Interpol are immutable.

#### Expressions (Vectors)
Expression Lists are always exposed as an Array.  These lists can only be accessed by numerical index.  These indexes are zero-based, meaning the first element is accessed with 0, and so on.

```ruby
let a = [1 + 8]      # single item list containing the number 9
let b = [5, 9 + 12]  # two item list containing 5 and 21

a[0]                 # displays 9
b[1]                 # displays 21
```

#### Name/Value Pairs (Dictionaries)
Name/Value Lists are always exposed as a Dictionary.  The name must be a valid identifier, while the value is any valid expression.

```ruby
[
  theMachine = 'Deep Thought',
  theAnswer = (28 - 7) * 2
]
# Treated like a dictionary { theMachine: 'Deep Thought', theAnswer: 42 }
```

### Member Retrieval
Like in JavaScript, membership expressions allow you to drill into an List's properties or elements.

```ruby
myList[0]
myList[someIndex or 0]
myObject.someProperty
myObject['someProperty']
```

### Assignment
Interpol does not have a general-purpose assignment operator (like JavaScript's `=` operator).  Instead, it allows you to bind variables to the current scope only using the `let` statement.  This statement explicitly shadows any identically named variables from parent scopes.

```ruby
let a = 42, b = [name = 'Thom', age = a], c = b | 'Howdy, %name'
```

You can also spread this across multiple lines, but the commas *must* be on the preceeding line:

```ruby
let a = 42,
    b = [name = 'Thom', age = a],
    c = b | 'Howdy, %name'
```

#### Scope Creation
It's important then to know where new scopes are created in Interpol.  The following operations will automatically create a new scope:

* partial invocations
* `for` loops (except their `else` blocks)

---
title: A Guide to Interpol
layout: interpol_guide
prev: 03-html
next: 05-branching
---
## String Interpolation
Quite simply, interpolation allows you to parameterize a string.  This is accomplished by adding interpolation escapes to a string (prefixed by `%`).  Interpolation can be performed positionally, by index, and by name.

Once a string contains these escapes, it can be called as if it were a function, either using the pipe operator or normal function calling syntax.  For example:

```ruby
person | 'My name is %name'
```

is the same as:

```
'My name is %name'(person)
```

Interpolation only cares about the first argument you provide to it.  Any additional arguments will be ignored.  For this reason, I prefer the first (piped) calling convention.

### Positional Interpolation
In its most basic form, you'd be merging a single parameter into a string.  This can be done using positional interpolation.

```ruby
people.length | 'There are % stooges'
```

If you have more than one parameter, you need to provide a list to the left side of the operator:

```ruby
[people.length, people.best] | 'There are % stooges, and % is the best'
```

In truth, the positional approach is rather limited, particularly since you could accomplish the same thing with multiple Expression Statements.  Where interpolation becomes important is when you're trying to localize an application and you need to parameterize a string from an expression on the left side of the operator.  Let's say you have the following string table called `str`:

```ruby
let str = [
  en=[
    stooge_summary='There are % stooges, and % is the best'
  ],
  de=[
    stooge_summary='Es gibt % Stooges und % ist die beste'
  ]
]
```

You could perform interpolation against an entry in the table by doing the following:

```ruby
[people.length, people.best] | str[lang].stooge_summary
```

### Indexed Interpolation
If your parameters always appear in the same order, then simple `%` characters embedded into strings will work fine.  But what if the ordering is not consistent?  Then you have to explicitly identify the index of the parameter you'd like to use, keeping in mind that they're zero-based:

```ruby
let str = [
  en=[
    stooge_summary='%1 is the best of the %0 Stooges'
  ],
  de=[
    stooge_summary='Es gibt %0 Stooges und %1 ist die beste'
  ]
]
```

You could perform interpolation against an entry in the table by doing the following:

```ruby
[people.length, people.best] | str[lang].stooge_summary
```

### Named Interpolation
Rather than simple values or lists, an object can be passed to the right side of the interpolation operator.  This will allow you to interpolate its properties by name.  To do this, follow the embedded `%` by a valid Interpol identifier:

```ruby
people | 'There are %length stooges'
```

Here, the `length` property of `people` will be interpolated into the resulting string.

### Automatic Interpolation
Strings surrounded by double quotes rather than single quotes are subject to automatic interpolation.  This means that if they contain named Interpolation escapes and no explicit Interpolation operator is present, then Interpol will resolve those variables from its current scope.

```ruby
let name = 'Bill'
let age = 42
"%name is %age years old"
```

## Piped Interpolation
The Interpolation feature also supports a restricted form of the piped call operator.  The restrictions in using this method are that the pipe character *can not* be surrounded by spaces and the right-hand operands can only be identifiers.  For example:

```ruby
from string import title
"User Profile - %name|title"
```

This will display the value of name in Title Case, as returned by the `title()` function.

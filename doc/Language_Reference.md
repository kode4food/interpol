# Interpol Language Reference

## Case Sensitivity
Interpol is case-sensitive, meaning any of the keywords and identifiers must appear in the same case by which they're represented either in this document or in the JavaScript data being passed to Interpol.  All Interpol keywords are lower-case, while JavaScript identifiers may be supplied in mixed case.

## New Lines
Interpol templates are partially NewLine sensitive.  Specifically, newlines are used to delimit certain grammatical constructs, particularly the statement blocks of Function Definitions, For Loops, and If/Else Branching (though each of these statements also allows a single-line syntax using a colon ':').  For example:

```
for item in list
  renderItem(item)
end
```

In this case, the NewLine after `item in list` is required to identify the statements to be executed and `end` is required to mark the end of those statements.  So long as there is only one statement to execute, this could also be represented as a single-line:

```
for item in list: renderItem(item)
```

In this case, the `end` keyword is not required.

Additionally, certain constructs will allow newlines only after a grouping delimiter or operands, such as tuples, ranges, and basic expressions.  So for example, these are all legal statements:

```
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

```
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

## Statements

### Function Definitions

```
def MyFunction(argument1, argument2)

end
```

### For Loops

```
for id2 in collection, id2 in collection2
end
```

### If/Else Branching

### HTML Elements

### Expression Statements

## Expressions

### Literals

#### Strings
#### Numbers
#### Boolean
#### Identifiers

### Tuples

### Membership

### Function Calls

### Unary Operators

### Multiplicative

### Additive

### Relational

### Equality

### And

### Or

### Conditional (Ternary)

### Interpolation

# Interpol Language Reference

## Case Sensitivity
Interpol is case-sensitive, meaning any of the keywords and identifiers must appear in the same case by which they're represented either in this document or in the JavaScript data being passed to Interpol.  All Interpol keywords are lower-case, while JavaScript identifiers may be supplied in mixed case.

## New Lines
Interpol templates are partially NewLine sensitive.  Specifically, new lines are used to delimit certain grammatical constructs, particularly the statement blocks of Partial Definitions, For Loops, and If/Else Branching (though each of these statements also allows a single-line syntax using a colon ':').  For example:

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

### Partial Definitions
Partials are reusable procedures that can be applied in a variety of contexts, such as in loops and conditionals.  For example, one might write a partial to render a single item in a list:

```
def renderItem(person, brother)
  <li>
    "% is the brother of %" % (brother, person.name)
  </li>
end
```

### For Loops
For loops allow one to recursively iterate over sets of items.  For example:

```
for person in people, brother in person.brothers
  renderItem(person, brother)
end
```

Since there is only one statement in the block, this could have also been written:

```
for person in people, brother in person.brothers: renderItem(person, brother)
```

In both cases, the outer loop iterates over all elements in `people`, assigning the identifier `person` to each element.  For each `person` item, an inner loop is executed that iterates over the person's `brothers` property, assigning the identifier `brother` to each element.  You'll notice that `person` is available in the inner loop's scope and that both identifiers are available in the statement block.

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

### Partial Calls

### Unary Operators

### Multiplicative

### Additive

### Relational

### Equality

### And

### Or

### Conditional (Ternary)

### Interpolation

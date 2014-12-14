---
title: A Guide to Interpol
layout: interpol_guide
prev: 02-data
next: 04-interpolation
---
## Creating HTML
Interpol is not a general-purpose templating system.  It was specifically designed to support dynamic HTML generation.  To accomplish this design goal, HTMLish elements are supported.  I say HTMLish because they're not static.

HTMLish elements allow HTML tags to be constructed using inlined expressions.  The nicest thing about this is that in many cases, these expressions end up looking *exactly* like normal HTML.  For example:

```html
<div id="parent" class="listItem">
```

This seems like raw HTML, but in fact both id and class are evaluating expressions for their values.  It just so happens that double and single-quoted strings are valid expressions in Interpol, so everything works out great.  But what if you want to augment the class attribute dynamically?

```ruby
let otherClasses = ['even', 'highlighted', 'selected']
<div id="parent" class="listItem %otherClasses">
```

In this case, the value of the class attribute will be computed dynamically from the expression `"listItem %otherClasses"`.  This expression is an Automatic Interpolation, which will be discussed later.  Just know that when a list is interpolated, each item is separated by a space, making it compatible with HTML's class attribute.

You can also compute the name of a tag or attribute dynamically by enclosing the expression in a precedence override).  For example:

```ruby
let theTagName = 'div', theAttrName = 'class'
let otherClasses = ['even', 'highlighted', 'selected']
<(theTagName) id="parent" (theAttrName)="listItem %otherClasses">
```

This will produce the same result as the previous example.

### Opening and Closing Tags
HTMLish elements *do not* create nested scopes and are not paired semantically into single statement blocks.  In fact, a closing element is not required at all.

### Comments
Interpol supports two forms of comments, HTML comments and End-of-Line Comments.  They behave differently, and this difference is important to understand.  HTML comments are passed all the way through the template processor and into the browser.  End-of-Line Comments are discarded by the Interpol parser.

HTML Comments, you might remember, look like this:

```html
<!-- I'm an HTML Comment! -->
```

While End-of-Line Comments start with a hash `#` and extend to the end of the current line in the template.

```ruby
# Loop over the brothers of everyone
for person in people, brother in person.brothers
  renderItem(person, brother)  # Render it!
end
```

### HTML DocType
Yeah, if you have a `<!DOCTYPE html>` at the top of your template, it will be included in the output.

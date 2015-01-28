---
title: A Guide to Interpol
layout: interpol_guide
prev: 06-looping
next: 08-imports
---
## All About Partials
Partials are reusable procedures that can be applied in a variety of contexts, such as in loops and conditionals.  For example, one might write a partial to render a list of items:

```ruby
def renderItem(items)
  <ul>
    for item in items
    <li>
      item | '%name is the name of the item'
    </li>
    end
  </ul>
end
```

Partials are first-class elements of Interpol, meaning they can be passed around and assigned to variables.  In certain situations, they are also hoisted to the top of their scope, so you can call them in your code even before they've been defined.  More on 'hoisting' later.

### Guarded Partials
The definition of a partial can also be 're-opened' to apply guard clauses, or to shadow the partial if no guard clause is provided.  The order in which partials are defined determines the order in which the guard clauses are evaluated, where the most recently defined will be evaluated first.  For example:

```ruby
def renderList(people)
  <ul>
  for person in people, sibling in person.siblings
    renderItem(person.name, sibling)
  end
  </ul>
end

def renderList(people) when not people
  <b>"There are no people to render!"</b>
end

renderList(people)
```

In this case, if `people` was an empty array, the second variation of renderList would be executed.  Otherwise control would fall-through to the first.  If the unguarded version of renderList had been defined last, it would shadow the previous definition, thus short-circuiting its possible evaluation.

    Re-opening a partial applies only to the current scope (and any of its nested scopes).  If you import a partial from a module and then re-open it with a guard, the re-opened version *will not* be applied globally.

### Inline-Guards
Interpol supports *very crude* pattern matching capability in Partial Definitions.  This facilitates what are essentially inline-guards.  For example:

```ruby
def renderItem(type, name)
  "This is a %type named %name"
end
```

This partial can be extended to deal with specific type values:

```ruby
def renderItem('developer', name)
  <b>"Developers rock! Especially %name"</b>
end
```

In this case, no local argument name is bound to the value.  You can simply treat it as discarded.  On the other hand, sometimes you're performing matching against lists and you may need access to the entire list in the body of your partial.  To do this, you can alias it like so:

```ruby
def renderPerson([type='developer'] as person)
  person | '%name writes code'
end

def renderPerson([type='banker'] as person)
  person | '%name steals money'
end

let me = [name='Thom', type='developer', age=42]
renderPerson(me)
```

### Function and Partial Calls
Like a function call in JavaScript.  A library function will either produce some template output or return a value, depending on its purpose.  A partial will aways return `Nil`.

```ruby
for item in list
  renderItem(item)
end
```

### Call Binding (@)
Interpol supports a binding operator `@`.  This is a special unary operator that allows you to perform argument binding on both functions and partials.  This is useful against functions for constructing piped calls.  For Example:

```ruby
from list import join
let j = @join(' -- ')
let a = ['joined','with','dashes']
"Result is %a|j"
```

Binding is also useful against partials when you want to pass them around for later invocation:

```ruby
from layouts import mainLayout
from partials import renderList
let renderItems = @renderList(items)
mainLayout('A Title', renderItems)
```

Now, when mainLayout invokes `renderItems()`, the bound list in `items` will be rendered.

### Piped Calls (|)
A piped call is an operator where the left operand is passed as the sole argument to the right operand.  The right operand must evaluate to a callable function.  These calls can be chained from left to right, where the result of each call is passed into the next right-hand operand.

```ruby
from list import join
from string import title
classes | join | title
```

### Calling With Blocks
A partial call can be made to leverage a block of statements attached to it.  These statements produce an inline partial which is treated as the final passed argument.  For example:

```ruby
def header(block)
  <h1> block </h1>
end

header do
  "hello there"
end

# results in: <h1> hello there </h1>
```

This will call the `header()` partial with the provided statement block (in this case `"hello there"`).

```ruby
def classyHeader(classes, block)
  <h1 class=classes> block </h1>
end

classyHeader(['title']) do
  "hello there"
end

# results in: <h1 class='title'> hello there </h1>
```

This will call the `classyHeader()` partial with an array of classes and the provided block of statements.

```ruby
def renderList(title, items, renderer)
  <h1>title</h1>
  for item in items
    renderer(item)
  end
end

# 'with' and 'do' are synonymous
renderList("People", people) with |item|
  item | "Name is %name and age is %age"
end
```

In this case, the `renderList()` partial will loop over the provided items, invoking the `renderer` block of statements for each.  It will also pass the item into the block.

If you're familiar with Ruby's blocks, this behavior may seem similar, but it's greatly simplified.  The block of statements is treated as the final *passed* argument, not as a specially marked argument in the partial's declaration.  In fact, it's really just syntactic sugar for:

```ruby
def renderList(title, items, renderer)
  <h1>title</h1>
  for item in items
    renderer(item)
  end
end

def renderItem(item)
  item | "Name is %name and age is %age"
end

renderList("People", people, renderItem)
```

Because it's treated like nothing special, a block can even be bound to a call and then called later.

```ruby
def renderList(renderer, items)
  <ul>
  for item in items
    <li> renderer(item) </li>
  end
  </ul>
end

let colorList = @renderList do |item|
  "this is a color: %item"
end

# call the partial with the bound block
colorList(['red', 'green', 'blue'])
```

### Hoisting
Under certain conditions, Partials are subject to something called 'hoisting'.  What this means is that the partial's definition will appear to have been defined at the top of the scope.  The conditions for this are rather simple: To be hoistable, all partial definitions must appear at the end of the current scope without other types of statements interspersed.  The Interpol rewriter will not attempt to infer your intent otherwise.

So, for example, these partials will be hoisted:

```ruby
partial1(partial2)  # call partial1 with a reference to partial2

def partial1(someValue)
  someValue
end

def partial2
  "hello there!"
end
```

But these will not be hoisted:

```ruby
partial1()  # call partial1 (won't work)

def partial1
  "hello"
end

partial2()  # makes hoisting invalid (won't work)

def partial2
  "there!"
end
```

So why hoisting?  There are some people who believe hoisting, in general, is bad.  For variables declarations I would definitely agree.  But for partials, I'm not so convinced.  I also think it's stylistically horrible to define nested partials at the top of a scope when that scope is also performing other statements that serve as the scope's true essence.  Because then you have to scroll down to find out what the partial actually does.  I hate scrolling.

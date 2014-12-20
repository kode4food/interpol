---
layout: post
title: Under the Hood (Part 1)
author: Thom
--- 
This is the first part in an ongoing series that discusses the internals of Interpol.  In this post I'll be focusing on variables and how they're resolved.  One might think it should be pretty straight-forward.  After all, a variable is a variable, right?  Well, in Interpol, we have to take into consideration not only the score of a variable, but their origin as well.

When you write a template like this:

```ruby
first_name + ' ' + last_name
```

Here's what's happening.

First, interpol parses your expression, creating an abstract syntax tree like this:

```
        .------[+]------.
        |               |
id:first_name   .------[+]------.
                |               |
           literal:' '     id:last_name
```

At this point, it understands that you're concatenating the identifier `first_name` to the identifier `last_name` with a space in-between, but it doesn't yet know what to do with those identifiers because it doesn't have a complete picture of your template.

Were they created as part of a `for` loop?  Are they arguments to a Partial?  Were they created with a `let` statement?  Or are they from the external context?  That picture becomes more clear throughout the rewriting and code generation phases.

During the rewriting phase, interpol performs depth-first traversals of the entire syntax tree, rewriting it both for efficiency and consumption by the code generator.  It also annotates its nodes with information such as when a variable is declared or mutated.  It then hands the rewritten AST over to the code generator.

The code generator performs a top-down walk of the AST to generate JavaScript code representing the tree.  In doing so, it now can maintain a stack of scope boundaries and their variable declarations.

So now when it encounters the `+` nodes above, it has an idea of whether or not a parent scope has declared either of the referenced variables.  If they haven't been declared, it knows it needs to attempt to resolve those variables externally from the provided context. Otherwise, it assumes they are already in scope and can be accessed directly.

In this case, both identifiers haven't been declared in the template and will be resolved via an external context retrieval.

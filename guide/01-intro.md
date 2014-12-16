---
title: A Guide to Interpol
layout: interpol_guide
prev: index
next: 02-data
---
## An Interpol Introduction
Interpol is Logicful HTML Template System.  Its purpose is to convert this:

```json
{
  "items": [
    { "type": "tool", "name": "Hammer" },
    { "type": "tool", "name": "Screwdriver" },
    { "type": "device", "name": "Mobile Phone" },
    { "type": "device", "name": "Computer" },
    { "type": "furniture", "name": "Table" },
    { "type": "furniture", "name": "Chair" }
  ]
}
```

Into this:

```html
  <div class="tool">Hammer</div>
  <div class="tool">Screwdriver</div>
  <div class="device">Mobile Phone</div>
  <div class="device">Computer</div>
  <div class="furniture">Table</div>
  <div class="furniture">Chair</div>
```

By doing this:

```ruby
for item in items
  <div class=item.type>item.name</div>
end
```

It does quite a bit more than that, but I'm sure you get the idea.

### Why Interpol?
Stuff you write should 'mean' something.  Not only at the time it's written, but years later.  It should also mean something to new eyes.  The arguments for terseness haven't flown since we stopped using punch cards, so why do we keep churning out languages that are replete with cryptic operators and grammatical constructs?  That said, Interpol's goals are modest.  It should:

  * Provide templates where *meaning* takes a front seat
  * Work well in both node.js and the Browser

### Hello, Interpol!
Alright, let's get started.  We're going to use Node for this example, so make sure you've installed it.  After it's installed, you can install Interpol globally like so:

```bash
npm -g install interpol
```

**Note:** Depending on your operating system's permissions, you may have to use 'sudo' for this call to work.

Once Interpol is installed, you can start the Node REPL by typing `node` in your Terminal.  After that, type this stuff in:

```javascript
var interpol = require('interpol');
var template = '<b>"Hello, %name!"</b>';
var result = interpol.evaluate(template, { name: 'World' });
console.log(result);
```

These four lines of JavaScript code should display:

```html
<b>Hello, World!</b>
```

Let's discuss what was happening here.  On the first line, we're pulling Interpol in as a dependency:

```javascript
var interpol = require('interpol');
```

The second line, you can probably guess, is just creating a string that contains the source of an Interpol template.

```javascript
var template = '<b>"Hello, %name!"</b>';
```

It's the third line that's doing the real work:

```javascript
var result = interpol.evaluate(template, { name: 'World' });
```

`interpol.evaluate()` is a convenience function that allows you to immediately compile and evaluate an Interpol template against a provided context.  Generally, you don't want to use this function in a real application because there's a lot of overhead in compiling a template every time it's needed.  Instead, it's better to compile your template ahead of time:

```javascript
var interpol = require('interpol');
var template = interpol('<b>"Hello, %name!"</b>');
var result = template({ name: 'World' });
console.log(result);
```

In this case, we're using the `interpol()` module to compile our template into a JavaScript function.  We can then call it as many times we like.

    Going Forward, the Templates are going to get a bit more complex and it will become increasingly difficult to type them into the Node REPL.  So instead, I'll be including a JSFiddle link for each example.

#### Worth Noting
Like JavaScript, Interpol is case-sensitive.  Though we haven't seen any yet, all keywords in Interpol are lower-case.  Additionally, new lines are mostly ignored, but it's important to avoid them before a comma (`,`) that is used to continue a statement (such as `let` or `import`).

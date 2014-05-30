# Interpol (Templates Sans Facial Hair)

## Introduction

There are a lot of templating systems out there and they're all similar.  In truth, Interpol isn't so different, which might beg the question:

    Why the hell another templating system?

The answer is simple.  I'm sick of looking at a template and being unable to read the thing, even if I wrote it yesterday.  That's why I developed Interpol.

That said, Interpol's goals are modest:

  * Provide a templating system where *meaning* takes a front seat
  * Work well in both Node.js and the Browser

Its goals *are not* to participate in the member-measuring and micro-optimization that seem to be so important to some developers.  These include:

  * No desire to be the 'smallest' minified footprint
  * No desire to be the 'fastest' template processor

Interpol will be as *small* and *fast* as possible, but no more, especially if those considerations detract from the aforementioned goal of providing *meaning*.

```html
from string import title
<html>
  <head>
    <title>"a static title"</title>
  </head>
  <body>
    "this is a list with %length items" % list
    <ul>
    for item in list
      <li class=item.type id="id-%id" % item>
        item.name | title
      </li>
    end
    </ul>
  </body>
</html>
```

The only static element on this page was its title, and usually even that isn't static.  So what did we do to escape *it* for static rendering?  We wrapped it in quotes.  The rest of the page was a clean mixture of HTMLish elements and dynamic content.

I say 'HTMLish' because it's not pure HTML.  The values of attributes are also evaluated.  For example:

```html
<li class=item.type id="id-%id" % item>
```

`class=item.type` outputs a class attribute whose value is taken from the item.type property.  `id="id-%" % item.id` outputs an id attribute whose value is interpolated from the item.id property.

That's all well and good, but what about the ability to reuse templates?  Well, to do that you define partials:

```html
from string import title as titleCase

page("a dynamic title", myContent)

def page(title, content)
  <html>
    <head>
      <title>title | titleCase</title>
    </head>
    <body>
      content()
    </body>
  </html>
end

def myContent
  "this is a list with %length items" % list
  renderList(list)
end

def renderList(list)
  <ul>
  for item in list
    renderItem(item)
  end
  </ul>
end

def renderItem(item)
  <li class=item.type id="id-%id" % item>
    item.name | titleCase
  </li>
end
```

What if you use these partials in multiple templates?  Then you can move them out into their own modules, maybe called `layout.int` and `lists.int`.

```html
# this is layout.int
from string import title as titleCase

def page(title, content)
  <html>
    <head>
      <title>title | titleCase</title>
    </head>
    <body>
      content()
    </body>
  </html>
end
```

```html
# this is lists.int
from string import title as titleCase

def renderList(list)
  <ul>
  for item in list
    renderItem(item)
  end
  </ul>
end

def renderItem(item)
  <li class=item.type id="id-%id" % item>
    item.name | titleCase
  </li>
end
```

And import them like so:

```html
from layout import page
from lists import renderList

page("a dynamic title", myContent)

def myContent
  "this is a list with %length items" % list
  renderList(list)
end
```

Easy as pie!  And your primary template gets right to the point.

## Current Status
The grammar has stabilized.  The run-time library is still under development, particularly formatting generators.  Optimizations still need to be made.  Check [the TODO document](doc/TODO.md) for an idea of what's to come.

## Installation
A pre-built version of the parser is already included.  If you'd like to build it yourself then you can do so by issuing the following command from the package's top-level directory:

```bash
npm install && npm run-script build && npm test
```

This will also install any development dependencies and run the nodeunit test suite.

## Inclusion in Node.js
Assuming you have installed the Interpol package with npm, you can include it in your Node code with the following:

```javascript
var interpol = require('interpol');
```

## Inclusion in a Browser
There are two ways to include Interpol templates in a browser-based application.  One is to compile raw templates using the Interpol compiler.  Another is to load the templates from pre-compiled JSON output.  The PEG.js parser used by the compiler is *massive* and slower than loading JSON, but it may be necessary if you want to compile ad-hoc templates.

*Note:* The entry point function for Interpol in the browser is *always* named `$interpol()`.

### Loading Pre-Compiled JSON
The `$interpol()` function will accept a pre-compiled JSON object instead of a JavaScript string.  This will allow you to bypass the loading of the PEG.js parser.  Instead, you can load pre-compiled templates from your server for faster initialization.

You can also invoke the compiler by calling the `$interpol.compile(Object)` function.

```html
<script src="build/interpol.min.js" type="text/javascript"></script>
```

*Note:* The Interpol command-line interface generates pre-compiled JSON.  You can install this globally using `npm -g install` and can then invoke the tools at your terminal by typing `interpol`.

### Including the PEG.js Compiler
If you *must* parse raw templates in the browser, you will need to load the version of Interpol that includes the compiler (and its PEG.js parser).

```html
<script src="build/interpol-parser.min.js" type="text/javascript"></script>
```

## Using the Library
To compile a raw template into a closure, invoke `$interpol(String)` as a function.  Provide to it a string containing your template:

```javascript
var compiledTemplate = $interpol(someTemplateString);
```

This will generate a closure that takes up to two parameters, both of which are optional.  The first is the data that your template renders.  The second is an options object used to override the content writer interface.  By default, the library writes to a JavaScript string.

```javascript
console.log(
  compiledTemplate({
    list: [
      { type: 'task', id: 1, name: 'This is my first task' },
      { type: 'story', id: 2, name: 'This is my first story' }
    ]
  })
);
```

## License (MIT License)
Copyright (c) 2014 Thomas S. Bradford

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

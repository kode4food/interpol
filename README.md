# Interpol (Templates Sans Facial Hair)
[![GitHub version](https://badge.fury.io/gh/kode4food%2Finterpol.png)](http://badge.fury.io/gh/kode4food%2Finterpol) [![Build Status](https://travis-ci.org/kode4food/interpol.png?branch=master)](https://travis-ci.org/kode4food/interpol)

## Introduction

There are a lot of templating systems out there and they're all similar.  In truth, Interpol isn't so different, which might beg the question:

    Why the hell another templating system?

The answer is simple.  I'm sick of looking at a template and feeling as though coding takes a back-seat to presentation.  The two roles seem to have blurred completely in recent years, so why the distinction?  I'm also sick of looking at a template and being unable to read the thing, even if it's one that I wrote yesterday.  That's why I developed Interpol.

That said, Interpol's goals are modest:

  * Provide easy to read/write templates that operate against JSON data
  * Work well in both Node.js and the Browser
  * Focus on an experience that favors dynamic content creation

This last goal is important because the templates we're creating are often devoid of static content.  So why must we 'escape' into a dynamic content mode using braces or processing instructions?  Why don't we just start in that mode and stay there?

```html
<html>
  <head>
    <title>"a static title"</title>
  </head>
  <body>
    "this is a list with %length items" % list
    <ul>
    for item in list
      <li class=item.type id="id-%id" % item>
        item.name
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
def renderItem(item)
  <li class=item.type id="id-%id" % item>
    item.name
  </li>
end

def renderList(list)
  <ul>
  for item in list
    renderItem(item)
  end
  </ul>
end

<html>
  <head>
    <title>"a static title"</title>
  </head>
  <body>
    "this is a list with %length items" % list
    renderList(list)
  </body>
</html>
```

What if you use these partials in multiple templates?  Then you can move them out into their own module called `mystuff.int`

```html
# this is mystuff.int

def renderItem(item)
  <li class=item.type id="id-%id" % item>
    item.name
  </li>
end

def renderList(list)
  <ul>
  for item in list
    renderItem(item)
  end
  </ul>
end
```

And import them like so:

```html
from mystuff import renderList

<html>
  <head>
    <title>"a static title"</title>
  </head>
  <body>
    "this is a list with %length items" % list
    renderList(list)
  </body>
</html>
```

## Current Status
The project was just started, so there's still quite a bit to do.  Check [the TODO document](doc/TODO.md) for an idea of what's to come.

## Installation
A pre-built version of the parser is already included.  If you'd like to build it yourself then you can do so by issuing the following command from the package's top-level directory:

```bash
npm install && npm run-script build && npm test
```

This will also install any development dependencies and run the nodeunit test suite.

## Inclusion in Node.js
Assuming you have installed the Interpol package with npm, you can include it in your Node code with the following:

```javascript
var $interpol = require('interpol');
```

*Note:* In Node you can name the returned function anything you'd like.  For these examples it will be `$interpol()`.  I leave out the dollar sign `$`.

## Inclusion in Express
A basic View Engine for [Express](http://expressjs.com/) is supported.  To set a development instance as the default engine, you can do the following:

```javascript
app.engine('int', require('interpol').__express);
app.set('view engine', 'int');
```

*Note:* You can also instantiate customized engines.  Customizations include setting the search path for import resolution (uses './views' by default) and turning off file-system monitoring ('true' by default).

## Inclusion in a Browser
There are two ways to include Interpol templates in a browser-based application.  The first is to parse/compile raw templates using the PEG.js parser.  The second is to compile the templates from pre-parsed JSON output.  The PEG.js parser is *massive* and slower than parsing JSON, but it may be necessary if you want to compile ad-hoc templates.

*Note:* The entry point function for Interpol in the browser is *always* named `$interpol()`.

### Including the PEG.js Parser
If you *must* parse raw templates in the browser, you will need to load the Interpol PEG.js parser.  The order in which you load the parser doesn't matter, so long as it's loaded before you attempt to compile a raw template.

```html
<script src="build/interpol-parser.min.js" type="text/javascript"></script>
<script src="build/interpol.min.js" type="text/javascript"></script>
```

### Compiling Pre-Parsed JSON
The `$interpol()` function will accept a pre-parsed JSON object instead of a JavaScript string.  This will allow you to bypass the loading of the PEG.js parser.  Instead, you can load pre-parsed templates from your server for faster compilation.

You can also invoke the compiler by calling the `$interpol.compile(Object)` function.

```html
<script src="build/interpol.min.js" type="text/javascript"></script>
```

*Note:* The Interpol command-line interface generates pre-parsed JSON.  You can install this globally using `npm -g install` and can then invoke the tools at your terminal by typing `interpol`.

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

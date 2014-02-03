# Interpol (Templates Sans Facial Hair)

## Introduction

At this moment, you might be asking a simple, and well-deserved question:

    Why the fuck another templating system?

Admittedly, there are a lot of them out there and they're all very similar.  In truth, Interpol isn't very different, except that it does one thing that most templating systems don't do:

    It favors producing dynamic content

This is important because, more often than not, the templates we're creating are pretty much devoid of static content.  So why is it that we need to 'escape' into a dynamic content mode using braces or processing instructions?  Why don't we just start in that mode and stay there?

```html
<html>
  <head>
    <title>"a static title"</title>
  </head>
  <body>
    "this is a list with % items" % list.length
    <ul>
    for item in list
      <li class=item.type id="id-%" % item.id>
        item.name
      </li>
    end
    </ul>
  </body>
</html>
```

The only static element on this page was its title, and usually even that isn't static.  So what did we do to 'escape' it for static rendering?  We wrapped it in quotes.  The rest of the page mixed html-ish elements and dynamic content rather seemlessly.

I say 'html-ish' because it's not pure HTML.  The value of attributes are also dynamically evaluated.  For example:

```html
<li class=item.type id="id-%" % item.id>
```

`class=item.type` outputs a class attribute whose value is taken directly from the item.type property.  `id="id-%" % item.id` outputs an id attribute whose value is interpolated from the item.id property.

That's all well and good, but what about the ability to reuse templates?

```html
def renderItem(item)
  <li class=item.type id="id-%" % item.id>
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
    "this is a list with % items" % list.length
    renderList(list)
  </body>
</html>
```

Or you can move them elsewhere:

```html
my_funcs.ipl
============
// render an item
def renderItem(item)
  <li class=item.type id="id-%" % item.id>
    item.name
  </li>
end
// render a list
def renderList(list)
  <ul>
  for item in list
    renderItem(item)
  end
  </ul>
end
```

And then your main template is cleaner

```html
from my_funcs import renderItem, renderList
<html>
  <head>
    <title>"a static title"</title>
  </head>
  <body>
    "this is a list with % items" % list.length
    renderList(list)
  </body>
</html>
```

## Current Status
The project was just started, so there's still quite a bit to do.  Check [the TODO document](doc/TODO.md) for an idea.

### Installation
A pre-built version of the parser is already included, but if you'd like to build it yourself then you can do so by issuing the following command from the package's top-level directory:

```bash
npm install && npm run-script build
```

This will also install any development dependencies and run the nodeunit test suite.

### Inclusion in Node.js
Assuming you have installed the Interpol package into your project with npm, you can include it in a Node.js module with the following:

```javascript
var interpol = require('interpol');

var compiledTemplate = interpol(someTemplateString);

console.log(compiledTemplate(someData));
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

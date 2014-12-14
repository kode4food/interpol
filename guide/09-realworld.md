---
title: A Guide to Interpol
layout: interpol_guide
prev: 08-imports
next: 10-api
---
## The Real World
To use Interpol, you have to decide where you're going to be rendering your templates.  Are you doing it on the server side using Node.js or in the browser?  If on the server side, are you rendering the templates manually, or do you want Express or hapi to do it for you automatically?  Once you've answered these questions, you can proceed.

### Getting Started With Node.js
If you're developing with Node.js, you'll minimally need to define 'interpol' as a dependency in your project.  Furthermore, if you'll be using its Express integration, you'll also need to define 'interpol-express' as a dependency.

```bash
npm install interpol --save
npm install interpol-views --save
```

#### Integrating with Express
#### Integrating with hapi

#### Advanced Configuration

### Interpol In The Browser
#### With Bower
You can install Interpol using Bower like so:

```
bower install interpol --save
```

#### Using &lt;script&gt; Tags
#### Creating Bundles

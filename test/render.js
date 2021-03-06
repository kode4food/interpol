/*
 * Interpol (HTML Composition Language)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

"use strict";

var nodeunit = require('nodeunit');
var interpol = require('../lib');
var evaluate = interpol.evaluate;

exports.render = nodeunit.testCase({
  setUp: function (callback) {
    callback();
  },

  "Counter Rendering": function (test) {
    var script1 = "let colors = ['red', 'green', 'blue']\n" +
                  "from render import counter\n" +
                  "let c = counter()\n" +
                  "for color in colors\n" +
                  '  [c(), color] | "% - %"\n' +
                  "end";

    var script2 = "let colors = ['red', 'green', 'blue']\n" +
                  "from render import counter\n" +
                  "let c = counter(2, 5)\n" +
                  "for color in colors\n" +
                  '  [c(), color] | "% - %"\n' +
                  "end";

    test.equal(evaluate(script1), "0 - red\n1 - green\n2 - blue\n");
    test.equal(evaluate(script2), "2 - red\n7 - green\n12 - blue\n");
    test.done();
  },

  "Even/Odd Rendering": function (test) {
    var script1 = "let colors = ['red', 'green', 'blue']\n" +
                  "from render import evenOdd\n" +
                  "let e = evenOdd()\n" +
                  "for color in colors\n" +
                  '  [e(), color] | "% - %"\n' +
                  "end";

    var script2 = "let colors = ['red', 'green', 'blue']\n" +
                  "from render import evenOdd\n" +
                  "let e = evenOdd('e', 'o')\n" +
                  "for color in colors\n" +
                  '  [e(), color] | "% - %"\n' +
                  "end";

    test.equal(evaluate(script1), "even - red\nodd - green\neven - blue\n");
    test.equal(evaluate(script2), "e - red\no - green\ne - blue\n");
    test.done();
  },

  "Separator Rendering": function (test) {
    var script1 = "let colors = ['red', 'green', 'blue']\n" +
                  "from render import separator\n" +
                  "let s = separator()\n" +
                  "for color in colors\n" +
                  '  [s(), color] | "%;%"\n' +
                  "end";

    var script2 = "let colors = ['red', 'green', 'blue']\n" +
                  "from render import separator\n" +
                  "let s = separator('---')\n" +
                  "for color in colors\n" +
                  '  [s(), color] | "%;%"\n' +
                  "end";

    var script3 = "let colors = ['red', 'green', 'blue']\n" +
                  "from render import separator\n" +
                  "def sep\n" +
                  "  '---'\n" +
                  "end\n" +
                  "let s = separator(sep)\n" +
                  "for color in colors\n" +
                  '  [s(), color] | "%;%"\n' +
                  "end";

    test.equal(evaluate(script1), "red\n, green\n, blue\n");
    test.equal(evaluate(script2), "red\n---green\n---blue\n");
    test.equal(evaluate(script3), "red\n---\ngreen\n---\nblue\n");
    test.done();
  },

  "Pluralizer Rendering": function (test) {
    var script1 = "from render import pluralizer\n" +
                  "let years = pluralizer('year', 'years')\n" +
                  "years(1)\nyears(0)\nyears(2)";

    var script2 = "from render import pluralizer\n" +
                  "let years = pluralizer('% year', 'years')\n" +
                  "years(1)\nyears(0)\nyears(2)";

    var script3 = "from render import pluralizer\n" +
                  "let years = pluralizer('year', '% years')\n" +
                  "years(1)\nyears(0)\nyears(2)";

    var script4 = "from render import pluralizer\n" +
                  "let years = pluralizer('% year', '% years')\n" +
                  "years(1)\nyears(0)\nyears(2)";

    var script5 = "from render import pluralizer\n" +
                  "let years = pluralizer('year')\n" +
                  "years(1)\nyears(0)\nyears(2)";

    test.equal(evaluate(script1), "year\nyears\nyears");
    test.equal(evaluate(script2), "1 year\nyears\nyears");
    test.equal(evaluate(script3), "year\n0 years\n2 years");
    test.equal(evaluate(script4), "1 year\n0 years\n2 years");
    test.equal(evaluate(script5), "year\nyears\nyears");
    test.done();
  }
});

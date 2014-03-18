/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

"use strict";

var util = require('../../util')
  , stringify = util.stringify;

var DefaultLocale = {
  a: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  A: ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday'],
  b: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  B: ['January', 'Februrary', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'],
  c: '%a %b %d %X %Y'
};

var cache = {};
new Date();

function buildFormatter(format) {
  var formatter = cache[format];
  if ( formatter ) {
    return formatter;
  }


}

function date(writer, format) {
  if ( format instanceof Date ) {
    return format.toDateString();
  }
  return buildFormatter(format);
}

function time(writer, format) {
  if ( format instanceof Date ) {
    return format.toTimeString();
  }
  return buildFormatter(format);
}

// Exports
exports.date = date;
exports.time = time;
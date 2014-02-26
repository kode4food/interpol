/**
 * Interpol (Templates Sans Facial Hair)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thom Bradford (github/kode4food)
 */

var interpol = module.exports = require('./interpol');
require('./resolvers');

try {
  require('express');
  interpol.__express = require('./express').createExpressEngine();
}
catch ( err ) {
  console.warn("Skipping registration of Express render engine");
}

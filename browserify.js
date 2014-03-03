var interpol = require('./lib/interpol');
require('./lib/resolvers/system');
require('./lib/resolvers/helper');
require('./lib/resolvers/memory');

// Set the Interpol browser global
window.$interpol = interpol;

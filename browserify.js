var interpol = require('./lib/interpol');
require('./lib/resolvers/system');
require('./lib/resolvers/helper');
require('./lib/resolvers/memory');
window.$interpol = interpol;

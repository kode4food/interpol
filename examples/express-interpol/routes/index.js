var interpol = require('interpol');

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', {
    "title": "Famous People",
    "people" : [
      { "name": "Larry", "brothers": ["Nobody"] },
      { "name": "Curly", "brothers": ["Moe", "Shemp"]},
      { "name": "Moe", "brothers": ["Curly", "Shemp"]}
    ],
    "callable": interpol.bless(function(writer, content) {
      writer.content("You can call me if I'm blessed by Interpol");
    }),
    "uncallable": function(writer, content) {
      writer.content("You can't call me though");
    }
  });
};

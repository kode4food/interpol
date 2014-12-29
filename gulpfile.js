/*
 * Interpol (Logicful HTML Templates)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

var fs = require('fs');

var gulp = require('gulp');
var concat = require('gulp-concat');
var inject = require('gulp-inject-string');
var jshint = require('gulp-jshint');
var nodeunit = require('gulp-nodeunit');
var istanbul = require('gulp-istanbul');
var enforcer = require('gulp-istanbul-enforcer');
var uglify = require('gulp-uglify');
var pegjs = require('gulp-peg');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');

var browserify = require('browserify');
var aliasify = require('aliasify');
var del = require('del');
var plato = require('plato');

var pkg = require('./package.json');

var buildDir = './build/';
var reportDir = './report';
var coverageFiles = ['./index.js', './lib/**/*.js'];
var sourceFiles = ['./index.js', './lib/**/*.js', './test/**/*.js'];
var testFiles = ['./test/index.js'];
var parserFile = ['./lib/compiler/parser.pegjs'];

var preamble = [
  "/*!", 
  pkg.name, "v"+pkg.version, "|", 
  "(c)", new Date().getFullYear(), pkg.author, "|",
  "interpoljs.io/license",
  "*/\n"
].join(' ');

var aliasifyConfig = {
  aliases: {
    "vm": false,
    "../../build/parser": "./build/browser-parser.js"
  },
  verbose: true,
  configDir: __dirname
};

var nodeUnitConfig = {
  reporter: 'default',
  reporterOptions: {
    output: 'test'
  }
};

var platoConfig = {
  title: "Interpol Complexity Analysis",
  jshint: {
    options: JSON.parse(fs.readFileSync('./.jshintrc').toString())
  },
  recurse: true
};

var uglifyConfig = { 
  mangle: true, 
  compress: false, 
  preserveComments: 'some'
};

var enforcerConfig = {
  thresholds: {
    statements: 90,
    branches: 90,
    lines: 90,
    functions: 90
  },
  coverageDirectory: 'coverage',
  rootDirectory: ''
};

function unitTests() {
  return gulp.src(testFiles).pipe(nodeunit(nodeUnitConfig));
}

function createParser(optimization, filename) {
  return gulp.src(parserFile)
             .pipe(pegjs({ optimize: optimization }))
             .pipe(rename(filename))
             .pipe(gulp.dest(buildDir));
}

gulp.task('lint', function (done) {
  gulp.src(sourceFiles)
      .pipe(jshint())
      .pipe(jshint.reporter('default'))
      .on('end', done);
});

gulp.task('node-parser', function (done) {
  createParser('speed', 'parser.js').on('end', done);
});

gulp.task('browser-parser', function (done) {
  createParser('size', 'browser-parser.js').on('end', done);
});

gulp.task('test', ['node-parser'], function (done) {
  unitTests().on('end', done);
});

gulp.task('coverage', ['node-parser'], function (done) {
  gulp.src(coverageFiles)
      .pipe(istanbul())
      .pipe(istanbul.hookRequire())
      .on('finish', function () {
        unitTests().pipe(istanbul.writeReports())
                   .on('end', done);
      });
});

gulp.task('enforce', ['lint', 'coverage'], function (done) {
  gulp.src('.')
      .pipe(enforcer(enforcerConfig))
      .on('end', done);
});

gulp.task('bundle-standard', function (done) {
  browserify('./browserify/standard.js')
      .bundle()
      .pipe(source('interpol.js'))
      .pipe(gulp.dest(buildDir))
      .on('end', done);
});

gulp.task('bundle-compiler', ['browser-parser'], function (done) {
  browserify('./browserify/compiler.js')
      .transform(aliasify.configure(aliasifyConfig))
      .bundle()
      .pipe(source('interpol-parser.js'))
      .pipe(gulp.dest(buildDir))
      .on('end', function () {
        del(['./build/browser-parser.js'], done);
      });
});

gulp.task('minify-standard', ['bundle-standard'], function (done) {
  gulp.src(['./build/interpol.js'])
      .pipe(inject.prepend(preamble))
      .pipe(uglify(uglifyConfig))
      .pipe(rename('interpol.min.js'))
      .pipe(gulp.dest(buildDir))
      .on('end', done);
});

gulp.task('minify-compiler', ['bundle-compiler'], function (done) {
  gulp.src(['./build/interpol-parser.js'])
      .pipe(inject.prepend(preamble))
      .pipe(uglify(uglifyConfig))
      .pipe(rename('interpol-parser.min.js'))
      .pipe(gulp.dest(buildDir))
      .on('end', done);
});

gulp.task('complexity', function (done) {
  plato.inspect(coverageFiles, reportDir, platoConfig, function () {
    done();
  });  
});

gulp.task('browserify', ['bundle-standard', 'bundle-compiler']);
gulp.task('minify', ['minify-standard', 'minify-compiler']);
gulp.task('build', ['enforce', 'complexity', 'minify']);
gulp.task('default', ['build']);

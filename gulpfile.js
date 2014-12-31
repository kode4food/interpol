/*
 * Interpol (Logicful HTML Templates)
 * Licensed under the MIT License
 * see doc/LICENSE.md
 *
 * @author Thomas S. Bradford (kode4food.it)
 */

var fs = require('fs');
var path = require('path');

var gulp = require('gulp');
var inject = require('gulp-inject-string');
var jshint = require('gulp-jshint');
var nodeunit = require('gulp-nodeunit');
var istanbul = require('gulp-istanbul');
var enforcer = require('gulp-istanbul-enforcer');
var minify = require('gulp-esmangle');
var pegjs = require('gulp-peg');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');

var browserify = require('browserify');
var del = require('del');
var plato = require('plato');

var pkg = require('./package.json');

var reportDir = './report';
var coverageFiles = ['./index.js', './lib/**/*.js'];
var sourceFiles = ['./index.js', './lib/**/*.js', './test/**/*.js'];
var testFiles = ['./test/index.js'];
var parserFile = ['./lib/compiler/parser.pegjs'];
var parserOutput = 'parser.js';

var standard = {
  source: browserifyDir('standard.js'),
  browserified: 'interpol.js',
  minified: 'interpol.min.js'
};

var compiler = {
  source: browserifyDir('compiler.js'),
  browserified: 'interpol-parser.js',
  minified: 'interpol-parser.min.js'
};

var preamble = [
  "/*!", pkg.name, "v"+pkg.version, "|",
  "(c)", new Date().getFullYear(), pkg.author, "|",
  "interpoljs.io/license", "*/\n"
].join(' ');

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

var minifyConfig = {
  legacy: false
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

function buildDir(filename) {
  if ( filename ) {
    return './' + path.join('./build', filename);
  }
  return './build';
}

function browserifyDir(filename) {
  if ( filename ) {
    return './' + path.join('./browserify', filename);
  }
  return './browserify';
}

function createUnitTests() {
  return gulp.src(testFiles).pipe(nodeunit(nodeUnitConfig));
}

function createBrowserifier(profile) {
  return browserify(profile.source)
        .bundle()
        .pipe(source(profile.browserified))
        .pipe(gulp.dest(buildDir()));
}

function createMinifier(profile) {
  return gulp.src(buildDir(profile.browserified))
        .pipe(minify(minifyConfig))
        .pipe(inject.prepend(preamble))
        .pipe(rename(profile.minified))
        .pipe(gulp.dest(buildDir()));
}

gulp.task('lint', function (done) {
  gulp.src(sourceFiles)
      .pipe(jshint())
      .pipe(jshint.reporter('default'))
      .on('end', done);
});

gulp.task('parser', function (done) {
  gulp.src(parserFile)
      .pipe(pegjs())
      .pipe(rename(parserOutput))
      .pipe(gulp.dest(buildDir()))
      .on('end', done);
});

gulp.task('test', ['parser'], function (done) {
  createUnitTests().on('end', done);
});

gulp.task('coverage', ['parser'], function (done) {
  gulp.src(coverageFiles)
      .pipe(istanbul())
      .pipe(istanbul.hookRequire())
      .on('finish', function () {
        createUnitTests().pipe(istanbul.writeReports()).on('end', done);
      });
});

gulp.task('enforce', ['lint', 'coverage'], function (done) {
  gulp.src('.')
      .pipe(enforcer(enforcerConfig))
      .on('end', done);
});

gulp.task('bundle-standard', function (done) {
  createBrowserifier(standard).on('end', done);
});

gulp.task('bundle-compiler', ['parser'], function (done) {
  createBrowserifier(compiler).on('end', done);
});

gulp.task('minify-standard', ['bundle-standard'], function (done) {
  createMinifier(standard).on('end', done);
});

gulp.task('minify-compiler', ['bundle-compiler'], function (done) {
  createMinifier(compiler).on('end', done);
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

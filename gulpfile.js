var gulp = require('gulp');
var jshint = require('gulp-jshint');

var sources = [
	'index.js',
	'lib/**/*.js',
	'test/**/*.js',
	'config/**/*.js',
	'server/**/*.js',
	'!server/public/bower_components{,/**}',
];

gulp.task('lint', function() {
	return gulp.src(sources)
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('clearREPL', function() {
	process.stdout.write('\u001B[2J\u001B[0;0f');
});

gulp.task('watch', function() {
	gulp.watch(sources, ['clearREPL', 'lint']);
});

gulp.task('default', ['clearREPL', 'lint', 'watch']);

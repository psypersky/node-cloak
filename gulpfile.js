var gulp = require('gulp');
var eslint = require('gulp-eslint');

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
    .pipe(eslint())
    .pipe(eslint.formatEach(null, console.log.bind(console)))
    .pipe(eslint.failOnError());
});

gulp.task('clearREPL', function() {
	process.stdout.write('\u001B[2J\u001B[0;0f');
});

gulp.task('watch', function() {
	gulp.watch(sources, ['clearREPL', 'lint']);
});

gulp.task('default', ['clearREPL', 'lint', 'watch']);

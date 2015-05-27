var gulp = require('gulp'),
    gulpLoadPlugins = require('gulp-load-plugins'),
    aux = gulpLoadPlugins();

gulp.task('js', function() {
    return gulp.src(['**/*.js', '!gulpfile.js', '!node_modules/**', '!dist/**'], {base: '.'})
    .pipe(aux.uglify())
    .pipe(gulp.dest('./dist/'));
});

gulp.task('img', function() {
	return gulp.src(['resources/**/*.jpg', 'resources/**/*.jpeg', 'resources/**/*.png',
		'resources/**/*.gif', '!node_modules/**', '!dist/**'], {base: '.'})
	.pipe(aux.imagemin())
	.pipe(gulp.dest('./dist/'));
});

gulp.task('css', function() {
	return gulp.src(['css/**/*.css', '!node_modules/**', '!dist/**'], {base: '.'})
	.pipe(aux.minifyCss())
	.pipe(gulp.dest('./dist/'));
});

gulp.task('html', function() {
	return gulp.src(['**/*.html', '!node_modules/**', '!dist/**'], {base: '.'})
	.pipe(aux.minifyHtml())
	.pipe(gulp.dest('./dist/'));
});

gulp.task('default', ['js', 'img', 'css', 'html']);

var gulp = require('gulp'),
    gulpLoadPlugins = require('gulp-load-plugins'),
    aux = gulpLoadPlugins();

gulp.task('js', function() {
    return gulp.src('src/**/*.js')
    .pipe(aux.uglify())
    .pipe(gulp.dest('.'));
});

gulp.task('img', function() {
	return gulp.src(['src/**/*.jpg', 'src/**/*.jpeg', 'src/**/*.png', 'src/**/*.gif'])
	.pipe(aux.imagemin())
	.pipe(gulp.dest('.'));
});

gulp.task('css', function() {
	return gulp.src('src/**/*.css')
	.pipe(aux.minifyCss())
	.pipe(gulp.dest('.'));
});

gulp.task('html', function() {
	return gulp.src('src/**/*.html')
	.pipe(aux.minifyHtml())
	.pipe(gulp.dest('.'));
});

gulp.task('default', ['js', 'img', 'css', 'html']);

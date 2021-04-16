var gulp = require('gulp');
var ts = require('gulp-typescript');
var tsProject = ts.createProject('tsconfig.json');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('resources', () => {
  return gulp
    .src([
      '*.json',
      'LICENSE',
      'README.md',
    ])
    .pipe(gulp.dest('dist'));
});

gulp.task('build-ts', () => {
  var tsResult = gulp
    .src('src/**/*.ts')
    .pipe(sourcemaps.init())
    .pipe(tsProject());

  return tsResult
    .pipe(
      sourcemaps.write('.', {
        sourceRoot: function(file) {
          return file.cwd + '/src';
        },
      }),
    )
    .pipe(gulp.dest('dist'));
});

gulp.task('build', gulp.series('resources', 'build-ts'));

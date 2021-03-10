const gulp = require("gulp");
const ts = require("gulp-typescript");
const tsProject = ts.createProject("tsconfig.json");
const del = require("del");
const mocha = require("gulp-mocha");

module.exports = class Tasks {
  constructor() {}

  compile() {
    const tsResult = tsProject.src().pipe(tsProject());

    return tsResult.js.pipe(gulp.dest("dist"));
  }

  static() {
    gulp
      .src(["package.json", "package-lock.json"])
      .pipe(gulp.dest("dist/src"));
    return gulp.src(["src/**/*.json"]).pipe(gulp.dest("dist"));
  }

  clean() {
    return del(["dist/**"]);
  }
};

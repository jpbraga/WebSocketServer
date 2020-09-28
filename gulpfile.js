const gulp = require("gulp");
const Tasks = require("./gulptasks/tasks");

(async () => {

  const _task = new Tasks();

  gulp.task('start',
    gulp.series(
      _task.clean,
      _task.compile,
      _task.static
    ));

})();

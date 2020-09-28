const gulp = require("gulp");
const Tasks = require("./gulptasks/tasks");

(async () => {

  const _task = new Tasks();

  gulp.task('start',
    gulp.series(
      //_task.runteste,
      _task.cleann,
      _task.compile,
      _task.static
    ));

})();

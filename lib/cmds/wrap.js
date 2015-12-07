'use strict';

var
  fs = require('../file-system'),
  spawn = require('child_process').spawn
  ;

function execute(opts) {
  spawn('cordova', opts.args, {cwd: opts.cwd, stdio: 'inherit'})
    .on('error', function(err) {
      opts.log(err);
      opts.log.error('You need ' + 'Cordova'.yellow + ' globally installed (npm install -g cordova).\n');
      process.exit(1);
    })
    .on('close', opts.callback);
}

function isWrapped(appPath) {
  return fs.exists(fs.joinPath(appPath, 'wrapper'));
}
function buildAvailable(appPath) {
  return fs.exists(fs.joinPath(appPath, 'dist'));
}
function exit(program, callback, message) {
  program.log.error(message);
  callback(1);
}

module.exports.wrap = function(program, appPath, callback) {
  if (isWrapped(appPath)) {
    return exit(program, callback, 'App is already wrapped by Cordova.');
    // ^^^ EARLY EXIT
  }

  program.log();
  program.log.info('Generating Cordova wrapper for Quasar App...\n');
  execute({
    log: program.log,
    cwd: appPath,
    args: ['create', 'wrapper'],
    callback: function(exitCode) {
      if (exitCode !== 0) {
        callback(exitCode);
        return; // <<< EARLY EXIT
      }
      var
        wrapper = fs.joinPath(appPath, 'wrapper'),
        www = fs.joinPath(appPath, 'wrapper/www')
        ;

      /* istanbul ignore if */
      if (fs.remove(www)) {
        return exit(program, callback, 'Cannot remove "www" folder.');
        // ^^^ EARLY EXIT
      }
      /* istanbul ignore if */
      if (fs.symlink('../dist', www)) {
        return exit(program, 'Cannot create symlink.');
        // ^^^ EARLY EXIT
      }

      program.log();
      program.log.success('Cordova wrapper created at', wrapper.yellow);
      program.log('Now edit', (wrapper + '/config.xml').yellow + '\n');

      callback(exitCode);
    }
  });
};

module.exports.run = function(program, appPath, args, callback) {
  if (!isWrapped(appPath)) {
    return exit(program, callback, 'App is' + 'NOT'.red + 'wrapped by Cordova.');
    // ^^^ EARLY EXIT
  }
  if (!buildAvailable(appPath)) {
    return exit(program, callback, 'Make a build first otherwise Cordova will error out.');
    // ^^^ EARLY EXIT
  }

  program.log();
  program.log.info('Executing Cordova command...\n');
  execute({
    log: program.log,
    cwd: fs.joinPath(appPath, 'wrapper'),
    args: args,
    callback: function(exitCode) {
      if (exitCode === 0) {
        program.log();
        program.log.success('Command executed.\n');
      }
      callback(exitCode);
    }
  });
};
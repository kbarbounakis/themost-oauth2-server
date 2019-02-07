/*eslint no-var: "off"*/
var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var tslint = require('gulp-tslint');
var child_process = require('child_process');
var options = require('./.themost-cli.json');
var path = require('path');
var tsProject = ts.createProject('tsconfig.json');

//server source directory
var buildDir = options.out;
//server source directory
var serverDir = options.base;
//server startup script
var serverScript = path.resolve(buildDir, "server.js");

var debugServerScript = path.resolve(serverDir, "server.ts");

// lint server modules
gulp.task('lint', () => {
    return gulp.src(`${serverDir}/**/*.ts`)
        .pipe(tslint({
            formatter: "verbose"
        }))
        .pipe(tslint.report())
});
// copy server files
gulp.task('copy', ()=> {
    return gulp.src([`${serverDir}/**/*`, `!${serverDir}/**/*.ts`])
        .pipe(gulp.dest(buildDir))
});

// build server modules
gulp.task('build', ['lint', 'copy'], () => {
    return gulp.src(`${serverDir}/**/*.ts`)
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(buildDir));
});

function build(src) {
    return gulp.src(src)
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(buildDir));
}

// serve app
gulp.task('serve', [ ], function() {
    let server, options, execArgv = [];
    //get debug argument
    const debug = process.execArgv.filter(function(x) { return /^--inspect(-brk)?=\d+$/.test(x); })[0];
    //if process is running in debug mode (--debug or --debug-brk arguments)
    if (debug) {
        //find debug port
        const debugPort = parseInt(/^--inspect(-brk)?=(\d+)$/.exec(debug)[2]);
        //get execution arguments except --debug or --debug-brk
        execArgv = process.execArgv.filter(function(x) { return !/^--inspect(-brk)?=\d+$/.test(x); }).splice(0);
        //push debug argument (while increasing debug port by 1)
        execArgv.push(debug.substr(0,debug.indexOf('=')+1)+(debugPort+1));
    }
    else {
        //otherwise get execution arguments
        execArgv = process.execArgv.splice(0);
    }
    //build child process options
    options = {
        //get parent process env variables
        env:process.env,
        //get execution arguments
        execArgv:execArgv
    };
    //push babel-core/register arguments
    if (execArgv.indexOf('ts-node/register')<0) {
        execArgv.push('--require');
        execArgv.push('ts-node/register');
    }
    //start child process (an express application)
    server = child_process.fork(debugServerScript,options);
    //watch for server module changes
    return gulp.watch(`${serverDir}/**/*`, function(event) {
        //wait for process to exit
        server.on('exit', function() {
            server = child_process.fork(debugServerScript,options);
        });
        //kill child process and wait to build server again
        server.kill("SIGINT");
    });
});
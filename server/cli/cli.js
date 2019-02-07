import path from 'path';
require('yargs')
    .commandDir(path.resolve(__dirname, 'commands'))
    .demandCommand()
    .help()
    .argv;
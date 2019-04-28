import path from 'path';

export const command = 'drop <command>';

export const desc = 'Drops a client application, user or scope';

export function builder(yargs) {
    return yargs.commandDir(path.resolve(__dirname, 'drop_commands'));
}

export function handler() {

}
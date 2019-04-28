import path from 'path';

export const command = 'add <command>';

export const desc = 'Add a new object (client, user, scope etc)';

export function builder(yargs) {
    return yargs.commandDir(path.resolve(__dirname, 'add_commands'));
}

export function handler() {

}
import 'console.table';
import {finalize, getApplication} from "../utils";


export const command = 'list';

export const desc = 'Lists all client applications';

export function builder(yargs) {
    return yargs.option('dev', {
        default: false,
        describe: 'enables development mode'
    });
}

export function handler(argv) {
    if (argv.dev) {
        process.env.NODE_ENV = 'development'
    }
    const app = getApplication();
    app.execute(async (context)=> {
        try {
            // get client
            let clients = await context.model('AuthClient').asQueryable().silent().getAllItems();
            // print list
            console.table(clients);
            // finalize context
            await finalize(context);
            // exit
            process.exit();
        }
        catch(err) {
            // finalize context
            await finalize(context);
            // log error
            console.error(err);
            // exit
            process.exit(-2);
        }
    });
}

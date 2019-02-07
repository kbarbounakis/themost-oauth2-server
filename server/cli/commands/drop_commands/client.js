import 'console.table';
import Table from 'easy-table';
import {finalize, getApplication, proceed} from "../../utils";


export const command = 'client <client_id>';

export const desc = 'Drops a client application';

export function builder(yargs) {
    return yargs.option('dev', {
        default: false,
        describe: 'Enables development mode'
    });
}

export function handler(argv) {
    if (argv.dev) {
        process.env.NODE_ENV = 'development'
    }
    const app = getApplication();
    app.execute(async (context)=> {
        try {

            let client = await context.model('AuthClient').where('client_id').select('client_id','name','redirect_uri','grant_type').equal(argv.client_id).silent().getItem();
            if (typeof client === 'undefined') {
                console.log('The specified client application cannot be found.');
                // finalize context
                await finalize(context);
                // exit
                return process.exit();
            }
            console.log('The following client application is going to be removed:');
            // print item
            console.log(Table.print(client));
            let c = await proceed();
            if (c) {
                let res = await context.model('AuthClient').silent().remove(client);
                console.log('The operation was completed succesfully.');
            }
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
import 'console.table';
import Table from 'easy-table';
import {Args} from "@themost/common";
import {finalize, getApplication, proceed} from "../../utils";


export const command = 'scope';

export const desc = 'Adds or updates an application scope';

export function builder(yargs) {
    return yargs.option('dev', {
        default: false,
        describe: 'Enables development mode'
    }).option('name', {
        default: 'profile',
        describe: 'Sets scope name e.g. profile:read'
    }).option('uri', {
        describe: 'Sets scope URI e.g. https://auth.example.com/scopes/profile'
    }).option('description', {
        describe: 'Sets scope description e.g. View profile data'
    });
}

export function handler(argv) {
    if (argv.dev) {
        process.env.NODE_ENV = 'development'
    }
    const app = getApplication();
    app.execute(async (context)=> {
        try {

            const item = {
                "name":argv.name,
                "url":argv.uri,
                "description":argv.description
            };
            Args.notEmpty(item.description, "Scope description cannot be empty");
            console.log('The following scope is going to be added or updated:');
            // print item
            console.log(Table.print(item));
            let c = await proceed();
            if (c) {
                let res = await context.model('AuthScope').silent().save(item);
                console.log('The operation was completed succesfully.');
                console.log('The following scope has been succesfully inserted or updated:');
                // print item
                console.log(Table.print({
                    "name":res.name,
                    "url":res.url || "<empty>",
                    "description":res.description
                }));
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
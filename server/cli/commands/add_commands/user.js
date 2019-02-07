import 'console.table';
import Table from 'easy-table';
import {Args} from "@themost/common";
import {TextUtils} from "@themost/common";
import {finalize, getApplication, proceed, password} from "../../utils";


export const command = 'user';

export const desc = 'Adds or updates a user';

export function builder(yargs) {
    return yargs.option('dev', {
        default: false,
        describe: 'Enables development mode'
    }).option('name', {
        default: 'user@example.com',
        describe: 'Sets user name e.g. user@example.com'
    }).option('description', {
        describe: 'Sets user description e.g. John Doe'
    }).option('password', {
        default: false,
        describe: 'Sets user password'
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
                "description":argv.description
            };
            Args.notEmpty(item.description, "User description cannot be empty");

            console.log('The following user is going to be added or updated:');
            // print item
            console.log(Table.print(item));
            let c = await proceed();
            if (c) {
                // validate password
                let newPassword;
                if (argv.password) {
                    newPassword = await password();
                    Args.notEmpty(newPassword, "User password cannot be empty");
                }
                let res = await context.model('User').silent().save(item);
                if (argv.password) {
                    // check if password exists
                    let exists = await context.model('UserCredential').silent().where('id').equal(res.id).count();
                    if (exists) {
                        // update password
                        await context.model('UserCredential').silent().save({
                           id: res.id,
                           userPassword: `{md5}${TextUtils.toMD5(newPassword)}`
                        });
                    }
                    else {
                        // set password
                        await context.model('UserCredential').silent().save({
                            $state: 1, // insert
                            id: res.id,
                            userPassword: `{md5}${TextUtils.toMD5(newPassword)}`
                        });
                    }
                }
                console.log('The operation was completed succesfully.');
                console.log('The following user has been succesfully inserted or updated:');
                // print item
                console.log(Table.print({
                    "name":res.name,
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
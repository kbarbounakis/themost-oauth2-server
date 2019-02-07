import 'console.table';
import Table from 'easy-table';
import {finalize, getApplication, proceed} from "../../utils";


export const command = 'client';

export const desc = 'Adds a new client application';

export function builder(yargs) {
    return yargs.option('dev', {
        default: false,
        describe: 'Enables development mode'
    }).option('name', {
        default: 'http://localhost:8080/auth/callback',
        describe: 'Sets client application name e.g. Test Application'
    }).option('uri', {
        default: 'http://localhost:8080/auth/callback',
        describe: 'Sets client application callback URI e.g. https://client.example.com/auth/callback'
    }).option('grant', {
        default: 'code',
        describe: 'Sets the client grant types represented by a comma separated string e.g. code,token or code,password etc'
    }).option('scope', {
        default: 'profile',
        describe: 'Sets the client scopes represented by a comma separated string e.g. profile or profile,user,user:read etc'
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
                "redirect_uri":argv.uri,
                "grant_type":argv.grant,
                "scopes": argv.scope.split(',').map( x=> {
                  return {
                      "name": x
                  }
                })
            };
            console.log('The following client application is going to be added:');
            // print item
            console.log(Table.print({
                "name":item.name,
                "redirect_uri":item.redirect_uri,
                "grant_type":item.grant_type,
                "scopes": item.scopes.map(x => x.name).join(',')
            }));
            let c = await proceed();
            if (c) {
                let res = await context.model('AuthClient').silent().save(item);
                console.log('The operation was completed succesfully.');
                console.log('The following client application has been succesfully inserted:');
                // print item
                console.log(Table.print({
                    "name":item.name,
                    "client_id":item.client_id,
                    "client_secret":item.client_secret,
                    "redirect_uri":item.redirect_uri,
                    "grant_type":item.grant_type,
                    "scopes": item.scopes.map(x => x.name).join(',')
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
/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {HttpApplication} from '@themost/web/app';
import {TraceUtils,TextUtils} from '@themost/common/utils';
import path from 'path';
import Q from 'q';
import prompt from 'prompt';
import _ from 'lodash';
import table from 'easy-table';
import program from 'commander';

/**
 * @param {string=} message
 * @returns {*}
 */
function proceed(message) {
    return Q.promise(function (resolve, reject) {
        prompt.start();
        prompt.get({
            name: 'yesno',
            message: (message || 'Do you want to proceed?') + ' (y/n)',
            validator: /y[es]*|n[o]?/,
            warning: 'Must respond yes or no',
            default: 'no'
        }, (err, respond) => {
            if (err) {
                return reject(err);
            }
            return resolve((respond.yesno === 'y'));
        });
    });
}

function passwordPrompt() {
    return Q.promise(function (resolve, reject) {
        prompt.start();
        prompt.get({
            name: 'yesno',
            message: ('New user password?'),
            validator: /y[es]*|n[o]?/,
            warning: 'Must respond yes or no',
            default: 'no'
        }, (err, respond) => {
            if (err) {
                return reject(err);
            }
            return resolve((respond.yesno === 'y'));
        });
    });
}

const app = new HttpApplication(path.resolve(__dirname));

program.version('0.0.1', '-v, --version')
    .option('-i, --insert', 'Adds a client application e.g. cli --add --title "Test Application" --uri "http://locahost:3000/auth/callback/"', null, null)
    .option('-a, --add', 'Adds a client application e.g. cli --add --title "Test Application" --uri "http://locahost:3000/auth/callback/" --grant "code,password"', null, null)
    .option('-d, --drop <id>', 'Drops a client application e.g.--drop "123456342893"', null, null)
    .option('-l, --list', 'Lists all client applications e.g. --list', null, null)
    .option('-t, --title <title>', 'Sets client application title e.g. --title "Test Application"', null, null)
    .option('-n, --name <name>', 'Sets token scope name e.g. --name "orders"', null, null)
    .option('-n, --password <password>', 'Sets user password e.g. --password "aNewP@ss1word%"', null, null)
    .option('-s, --description <description>', 'Sets token scope description e.g. --name "orders"', null, null)
    .option('-u, --uri <uri>', 'Sets client application callback URI e.g. --uri "http://locahost:3000/auth/callback/"', null, null)
    .option('-g, --grant <grant>', 'Sets client application grant type e.g. --grant "code", --grant "code,password" etc', null, null)
    .option('-as, --addscope', 'Adds a token scope e.g. cli --addscope --name "orders" --description "Show orders" --uri "http://www.example.com/scopes/orders"', null, null)
    .option('-user, --adduser', 'Adds or updates a user e.g. cli --adduser --name "doe@example.com" --description "John Doe" --password', null, null)
    .parse(process.argv);

if (program.hasOwnProperty('list')) {
    app.execute(function (context) {
        return context.model('AuthClient').asQueryable().silent().getItems().then((result) => {
            console.log('\n');
            console.log(table.print(result));
            return process.exit(0);
        }).catch((err) => {
            TraceUtils.log(err);
            process.exit(-1);
        });
    });
}
else if (_.isString(program['drop'])) {
    app.execute((context) => {
        return context.model('AuthClient').where('client_id').equal(program['drop']).silent().getItem().then((result) => {
            if (_.isNil(result)) {
                return context.finalize(() => {
                    TraceUtils.log('The specified client application cannot be found.');
                    return process.exit(-404);
                });
            }
            TraceUtils.log('The following client application will be removed:');
            console.log(table.print(result));
            proceed().then((respond) => {
                if (!respond) {
                    TraceUtils.log('The operation was cancelled by the user.');
                    return context.finalize(()=>{
                        process.exit(0);
                    });
                }
                //drop client
                context.model('AuthClient').silent().remove(result).then(()=> {
                    TraceUtils.log('The operation was completed succesfully.');
                    TraceUtils.log('The following client has been permanently removed:');
                    console.log(table.print(result));
                    context.finalize(() => {
                        process.exit(0);
                    });
                }).catch((err) => {
                    context.finalize(() => {
                        TraceUtils.log('An error occurred while dropping client.');
                        TraceUtils.log(err);
                        process.exit(-500);
                    });
                });

            }).catch((err)=> {
                TraceUtils.log('An internal application error occured.');
                TraceUtils.log(err);
                context.finalize(()=>{
                    process.exit(-500);
                });
            });
        }).catch((err) => {
            TraceUtils.log('An error occurred while processing client data.');
            TraceUtils.log(err);
            context.finalize(()=>{
                process.exit(-500);
            });
        });
    });
}
else if (program.hasOwnProperty('insert') || program.hasOwnProperty('add')) {
    if (!_.isEmpty(program.title) && !_.isEmpty(program.uri)) {
        app.execute((context) => {
            const item = {
                "name":program.title,
                "redirect_uri":program.uri
            };
            if (_.isString(program['grant'])) {
                item.grant = program['grant']
            }
            TraceUtils.log('The following client application will be added:');
            console.log(table.print(item));
            proceed().then((respond) => {
                if (!respond) {
                    TraceUtils.log('The operation was cancelled by the user.');
                    return context.finalize(()=>{
                        process.exit(0);
                    });
                }
                context.model('AuthClient').silent().save(item).then(function() {
                    TraceUtils.log('The operation was completed succesfully');
                    TraceUtils.log('The following client application was succesfully inserted:');
                    console.log(table.print(item));
                    context.finalize(()=>{
                        process.exit(0);
                    });

                }).catch((err) => {
                    TraceUtils.log('An error occurred while inserting client application.');
                    TraceUtils.log(err);
                    context.finalize(()=>{
                        process.exit(-500);
                    });
                });
            }).catch((err)=> {
                TraceUtils.log('An internal application error occured.');
                TraceUtils.log(err);
                context.finalize(()=>{
                    process.exit(-500);
                });
            });
        });
    }
    else {
        TraceUtils.log('Client application title and callback URI cannot be empty.');
        process.exit(-400);
    }
}
else if (program.hasOwnProperty('addscope')) {
    if (!_.isEmpty(program.name) && !_.isEmpty(program.description)) {
        app.execute((context) => {
            const item = {
                "name":program.name,
                "description":program.description
            };
            if (_.isString(program.uri)) {
                item.url = program.uri;
            }
            TraceUtils.log('The following token scope will be added:');
            console.log(table.print(item));
            proceed().then((respond) => {
                if (!respond) {
                    TraceUtils.log('The operation was cancelled by the user.');
                    return context.finalize(()=>{
                        process.exit(0);
                    });
                }
                context.model('AuthScope').silent().save(item).then(function() {
                    TraceUtils.log('The operation was completed succesfully');
                    TraceUtils.log('The following token scope was succesfully inserted:');
                    console.log(table.print(item));
                    context.finalize(()=>{
                        process.exit(0);
                    });

                }).catch((err) => {
                    TraceUtils.log('An error occurred while inserting token scope.');
                    TraceUtils.log(err);
                    context.finalize(()=>{
                        process.exit(-500);
                    });
                });
            }).catch((err)=> {
                TraceUtils.log('An internal application error occured.');
                TraceUtils.log(err);
                context.finalize(()=>{
                    process.exit(-500);
                });
            });
        });
    }
    else {
        TraceUtils.log('Token scope name and description may not be empty.');
        process.exit(-400);
    }
}
else if (program.hasOwnProperty('adduser')) {
    if (!_.isEmpty(program.name) && !_.isEmpty(program.description)) {
        app.execute((context) => {
            const item = {
                "name":program.name,
                "description":program.description
            };
            TraceUtils.log('The following user will be added or updated:');
            console.log(table.print(item));
            proceed().then((respond) => {
                if (!respond) {
                    TraceUtils.log('The operation was cancelled by the user.');
                    return context.finalize(()=>{
                        process.exit(0);
                    });
                }
                context.model('User').silent().save(item).then(function() {
                    if (program.password) {
                        return context.model('UserCredential').silent().where('id').equal(item.id).count().then((exists)=> {
                            return context.model('UserCredential').silent().save({
                                "id":item.id,
                                "userPassword": "{md5}" + TextUtils.toMD5(program.password),
                                "$state": exists ? 2 : 1
                            }).then(()=> {
                                TraceUtils.log('The operation was completed succesfully');
                                context.finalize(()=>{
                                    process.exit(0);
                                });
                            });
                        });
                    }
                    else {
                        TraceUtils.log('The operation was completed succesfully');
                    }
                }).catch((err) => {
                    TraceUtils.log('An error occurred while inserting or updating user.');
                    TraceUtils.log(err);
                    context.finalize(()=>{
                        process.exit(-500);
                    });
                });
            }).catch((err)=> {
                TraceUtils.log('An internal application error occured.');
                TraceUtils.log(err);
                context.finalize(()=>{
                    process.exit(-500);
                });
            });
        });
    }
    else {
        TraceUtils.log('User name and description cannot be empty.');
        process.exit(-400);
    }
}
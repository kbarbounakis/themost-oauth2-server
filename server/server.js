/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {HttpApplication} from '@themost/web/app';
import path from 'path';
import _ from 'lodash';
import "./extensions/http-context-extensions";
import "./extensions/html-view-helper-extensions";
import ejsLocals from 'ejs-locals';
import {HtmlViewHelper} from '@themost/web/helpers';
import {TraceUtils} from "@themost/common";
const app = new HttpApplication(path.resolve(__dirname));

//use static content
app.useStaticContent(path.resolve(process.cwd(), './public'));

//handle error response

app.on('error', function(event, callback) {
    const context = event.context, response = context.response, error = event.error;
    if (/application\/json/g.test(context.request.headers.accept) || context.format === 'json') {
        return context.application.errors.json(context, error, callback);
    }
    else {
        // trace error
        TraceUtils.error(error);
        // set locals
        let locals = {
            model: Object.assign({}, {
                statusCode: 500
            }, error),
            html: new HtmlViewHelper(context)
        };
        // render error
        ejsLocals(path.resolve(__dirname, 'views/error/error.html.ejs'), {
            settings: {
              "view engine": "html.ejs"
            },
            locals: locals
        }, ((err, str) => {
            response.writeHead(error.statusCode || 500 , { "Content-Type": "text/html" });
            response.write(str);
            response.end();
        }));
    }
});

//set app settings defaults
app.getConfiguration().settings.app = _.assign({
    //application title
    "title": "@theMOST Ecosystem",
    //application logo
    "logo":"/images/themost_logo_256.png",
    //application favicon
    "favicon":"/favicon.ico",
    //show password reminder link
    "showPasswordReminderLink": true,
    //rotate background of login page
    "rotateLoginPageBackground": false
},app.getConfiguration().settings.app || {});

process.on('SIGTERM', function() {
        console.log("\nSIGTERM Terminating");
        process.exit(0);
    })
    .on('SIGINT', function() {
        console.log("\nSIGINT Terminating");
        process.exit(0);
    });

module.exports = app;
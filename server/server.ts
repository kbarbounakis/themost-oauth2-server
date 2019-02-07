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
import * as _ from 'lodash';
import {AngularServerModule} from "@themost/web/angular/module";
import "./extensions/http-context-extensions";
import "./extensions/html-view-helper-extensions";
import ejs from 'ejs';
import fs from 'fs';
import {HtmlViewHelper} from '@themost/web/helpers';
import {TraceUtils} from "@themost/common";
const app = new HttpApplication(path.resolve(__dirname));

//use static content
app.useStaticContent(path.resolve(process.cwd(), './public'));

//handle error response

app.on('error', function(event, callback) {
    const context = event.context, response = context.response, error = event.error;
    TraceUtils.error(error);
    if (/application\/json/g.test(context.request.headers.accept) || context.format === 'json') {
        return context.application.errors.json(context, error, callback);
    }
    else {
        fs.readFile(path.resolve(__dirname, 'views/error/error.html.ejs'),'utf8',(err, data)=> {
            let str = ejs.render(data, {
               model: Object.assign({}, {
                    statusCode: 500
                   }, error),
               html: new HtmlViewHelper(context)
            });
            response.writeHead(error.statusCode || 500 , { "Content-Type": "text/html" });
            response.write(str);
            response.end();
        });
    }
});

//set app settings defaults
app.getConfiguration().settings.app = _.assign({
    //application title
    "title": "Universis Experimental OAuth2 Server",
    //application logo
    "logo":"/images/themost_logo_256.png",
    //application favicon
    "favicon":"/favicon.ico",
    //show password reminder link
    "showPasswordReminderLink": false,
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
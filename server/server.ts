/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {HttpApplication} from '@themost/web/app';
import {resolve} from 'path';
import './extensions/http-context-extensions';
import {TraceUtils} from '@themost/common';
import {LocalizationStrategy, I18nLocalizationStrategy} from '@themost/web';

const app = new HttpApplication(resolve(__dirname));
// use static content
app.useStaticContent(resolve(process.cwd(), './public'));
// use i18n localization strategy
app.useStrategy(LocalizationStrategy, I18nLocalizationStrategy);
// handle error response
app.on('error', (event, callback) => {
    // get context
    const context = event.context;
    // get client response
    const response = context.response;
    // get error
    const error = event.error;
    // trace error
    TraceUtils.error(error);
    if (/application\/json/g.test(context.request.headers.accept) || context.format === 'json') {
        return context.application.errors.json(context, error, callback);
    } else {
        // get application error template
        const errorTemplateFile = resolve(__dirname, 'views/error/error.html.ejs');
        // use application engine to render error
        context.engine('ejs').render(errorTemplateFile, Object.assign({}, error), (err, data) => {
            // if error occurred while rendering application error template
            if (err) {
                // trace error
                TraceUtils.error('An error occurred while rendering application error');
                TraceUtils.error(err);
                // write header for internal server error
                response.writeHead(500);
                // and exit
                return response.end();
            }
            // otherwise send html error
            response.writeHead(error.statusCode || 500 , { 'Content-Type': 'text/html' });
            response.write(data);
            response.end();
        });
    }
});

process.on('SIGTERM', () => {
        TraceUtils.log('\nSIGTERM Terminating');
        process.exit(0);
    })
    .on('SIGINT', () => {
        TraceUtils.log('\nSIGINT Terminating');
        process.exit(0);
    });

module.exports = app;

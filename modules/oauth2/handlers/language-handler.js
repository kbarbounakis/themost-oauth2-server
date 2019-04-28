/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import moment from "moment";
/**
 * @class
 * @augments BeginRequestHandler
 */
export class LanguageHandler {
    static createInstance() {
        return new LanguageHandler();
    }

    /**
     * @param {HttpContext} context
     * @param {Function} callback
     */
    beginRequest(context, callback) {
        try {
            // check if query contains lang parameter
            if (context.params && typeof context.params.lang === 'string') {
                // get parameter in lower case
                let lang = context.params.lang;
                // search cultures
                let cultures = context.getApplication().getConfiguration().getSourceAt('settings/localization/cultures');
                if (Array.isArray(cultures)) {
                    let findIndex = cultures.findIndex(x => {
                        // if lang has windows culture e.g. en-US
                        if (/-/i.test(lang)) {
                            return new RegExp('^' + lang + '$', 'i').test(x);
                        }
                        // otherwise test for e.g. 'en-' in ['en-us','el-gr']
                        return new RegExp('^' + lang + '-', 'i').test(x);
                    });
                    // if culture was found
                    if (findIndex >= 0) {
                        // set cookie
                        context.cookie('.LANG', cultures[findIndex], moment().add(30, 'days').toDate());
                        // set context culture
                        context.culture(cultures[findIndex]);
                        // and finally return
                        return callback();
                    }
                }
            }
            // check cookie
            if (context.cookie(".LANG")) {
                return callback();
            } else {
                // otherwise get default lang
                context.culture(context.getApplication().getConfiguration().getSourceAt('settings/localization/default'));
                return callback();
            }
        } catch (error) {
            return callback();
        }
    }
}

/**
 * @returns {LanguageHandler}
 */
export function createInstance() {
    return new LanguageHandler();
}

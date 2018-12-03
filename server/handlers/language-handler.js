/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
/**
 * @class
 * @extends BeginRequestHandler
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
        try{
            if(context.cookie(".LANG")){
                return callback();
            }
            else {
                context.culture(context.getApplication().getConfiguration().getSourceAt('settings/localization/default'));
                return callback();
            }
        }catch(error){
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

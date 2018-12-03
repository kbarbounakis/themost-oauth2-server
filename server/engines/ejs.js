/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {HtmlViewHelper} from "@themost/web/helpers";
/**
 * @function ejsLocals
 * @param {string} file
 * @param {*} options
 * @param {Function} fn
 */
let ejsLocals = require('ejs-locals');

/**
 * @description Use ejs-locals as view engine of @themost/web
 * @class
 * @augments HttpViewEngine
 */
class EjsLocalsEngine {
    /**
     * @param {HttpContext} context
     */
    constructor(context) {
        Object.defineProperty(this, 'context', {
            get: () => {
                return context;
            }
        })
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @returns HttpContext
     */
    getContext() {
        return this.context;
    }


    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {string} filename
     * @param {*} data
     * @param {Function} callback
     */
    render(filename, data, callback) {
        let self = this;
        let locals = {
            model: data,
            html:new HtmlViewHelper(self.context)
        };
        try {
            ejsLocals(filename, {
                settings: {
                    "view engine": "html.ejs"
                },
                locals: locals
            },  (err, body) => {
                return callback(err, body);
            });
        }
        catch(err) {
            return callback(err);
        }

    }

}

module.exports.EjsLocalsEngine = EjsLocalsEngine;

module.exports.createInstance = (context) => {
  return new EjsLocalsEngine(context);
};
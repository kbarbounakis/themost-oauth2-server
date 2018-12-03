/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com
 *                     Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */

import {DataObject} from '@themost/data/data-object';
import {EdmMapping} from '@themost/data/odata';
/**
 * @class
 * @property {string} client_id
 * @property {string} user_id
 * @property {Date} expires
 * @property {string} access_token
 * @augments {DataObject}
 */
@EdmMapping.entityType('AccessToken')
export default class AccessToken extends DataObject {
    constructor() {
        super();
        this.selector('expired', (callback)=> {
            const expired = (new Date(this.expires)).getTime()<(new Date()).getTime();
            return callback(null, expired);
        });
    }
}
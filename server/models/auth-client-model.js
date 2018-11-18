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
import _ from 'lodash';
import url from 'url';
/**
 * @property {string} client_id
 * @property {string} name
 * @property {string} client_secret
 * @property {string} grant_type
 * @property {string} redirect_uri
 */
@EdmMapping.entityType('AuthClient')
class AuthClient extends DataObject {
    constructor() {
        super();
    }

    /**
     * @param {string} grant_type
     * @returns {boolean}
     */
    hasGrantType(grant_type) {
        if (_.isNil(this.grant_type)) {
            return false;
        }
        return (this.grant_type.split(',').indexOf(grant_type)>=0);
    }

    /**
     * @param {string} redirect_uri
     * @returns {boolean}
     */
    hasRedirectUri(redirect_uri) {
        if (_.isString(redirect_uri)) {
            let re = new RegExp('^' + this.redirect_uri.replace("*","(.*?)") + '$','ig');
            return re.test(redirect_uri);
        }
        return false;
    }

}

module.exports = AuthClient;
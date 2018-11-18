/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com
 *                     Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {EdmMapping,EdmType} from '@themost/data/odata';
import {TextUtils} from '@themost/common/utils';
let Account = require('./account-model');
/**
 * @class
 
 * @property {number} id
 * @property {Date} lockoutTime
 * @property {number} logonCount
 * @property {boolean} enabled
 * @property {boolean} external
 * @property {Date} lastLogon
 * @property {Array<Group>} groups
 * @augments {DataObject}
 */
@EdmMapping.entityType('User')
class User extends Account {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
    /**
     * Validates the given username and password and returns an instance of user on success.
     * @param {ExpressDataContext} context
     * @param {string} username
     * @param {string} password
     * @returns Promise<User>
     */ 
    static async validate(context, username, password) {
        // get user
        let user = await context.model('User').where('name').equal(username).silent().getTypedItem();
        // if user does exist return
        if (typeof user === 'undefined' || user === null) {
            return;
        }
        // check if username and password are valid
        let exists = await context.model('UserCredential')
                .where('userPassword').equal('{clear}'.concat(password))
                .or('userPassword').equal('{md5}' + TextUtils.toMD5(password))
                .or('userPassword').equal('{sha1}' + TextUtils.toSHA1(password))
                .prepare()
                .and('id').equal(user.id)
                .silent()
                .count();
        if (exists) {
            return user;
        }
    }
    
}
module.exports = User;
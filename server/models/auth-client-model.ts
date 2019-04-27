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
 * @property {string} client_id
 * @property {string} name
 * @property {string} client_secret
 * @property {string} grant_type
 * @property {string} redirect_uri
 */
@EdmMapping.entityType('AuthClient')
class AuthClient extends DataObject {
    /**
     * @description Gets or sets a string which represents an OAuth2 client identfier
     */
    public client_id: string;
    /**
     * @description Gets or sets a string which represents a description for an OAuth2 client
     * e.g. Test Application
     */
    public name: string;
    /**
     * @description Gets or sets a string which represents an OAuth2 client secret
     */
    public client_secret: string;
    /**
     * @description Gets or sets a string which represents an OAuth2 client redirect URI
     * e.g. https://example.com/app/*
     */
    public redirect_uri: string;
    /**
     * @description Gets or sets a string which represents a comma separeted list of grant types
     * e.g. code;token etc
     */
     public grant_type: string;
    /**
     * @description Gets or sets an array of objects which represent the client available scopes
     */
    public scopes: any[];
    constructor() {
        super();
    }

    /**
     * @param {string} grant_type
     * @returns {boolean}
     */
    public hasGrantType(grant_type: string): boolean {
        if (typeof this.grant_type !== 'string') {
            return false;
        }
        return (this.grant_type.split(',').indexOf(grant_type) >= 0);
    }

    /**
     * @param {string} redirect_uri
     * @returns {boolean}
     */
    public hasRedirectUri(redirect_uri: string): boolean {
        if (typeof redirect_uri === 'string') {
            const re = new RegExp('^' + this.redirect_uri.replace('*', '(.*?)') + '$', 'ig');
            return re.test(redirect_uri);
        }
        return false;
    }

    /**
     * @param {string} scope
     * @returns {Promise<boolean>}
     */
    public async hasScope(scope: string): Promise<boolean> {
        if (typeof scope !== 'string') {
            throw new TypeError('Invalid argument. Scope must be a string');
        }
        // split scopes
        const scopes = scope.split(',');
        if (Array.isArray(this.scopes)) {
            const found = scopes.filter((thisScope) => {
                return this.scopes.findIndex( (x) => {
                   return new RegExp('^' + thisScope + '$', 'i').test(x.name);
                }) >= 0;
            }).length;
            return found === scopes.length;
        }
        // count scopes
        const count = await this.property('scopes').where('name').equal(scopes).silent().count();
        // count must be equal to scopes length
        return count === scopes.length;
    }



}

<<<<<<< HEAD
export = AuthClient;
=======
export default AuthClient;
>>>>>>> 50e27596f5a778b632e6f9389f21ae065ccde091

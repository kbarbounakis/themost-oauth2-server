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
 * @augments {DataObject}
 */
@EdmMapping.entityType('AccessToken')
class AccessToken extends DataObject {

    /**
     * @description Gets or sets a string which represents the client associated with this access token.
     */
    public client_id: string;
     /**
      * @description Gets or sets a string which represents a user.
      */
    public user_id: number;
     /**
      * Gets or sets a string which represents an access token.
      */
    public access_token: string;
     /**
      * @description Gets or sets the expiration date time.
      */
    public expires: Date;

    constructor() {
        super();
        this.selector('expired', (callback) => {
            const expired = (new Date(this.expires)).getTime() < (new Date()).getTime();
            return callback(null, expired);
        });
    }

}

export default AccessToken;

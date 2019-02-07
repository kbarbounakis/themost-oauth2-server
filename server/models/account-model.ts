/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com
 *                     Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {EdmMapping} from '@themost/data/odata';
import Thing from './thing-model';
/**
 * @class
 
 * @property {number} id
 * @property {number} accountType
 * @augments {DataObject}
 */
@EdmMapping.entityType('Account')
class Account extends Thing {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
    /**
      * @description The identifier of the item.
      */
     public id: number = 0; 
     
     /**
      * @description Contains a set of flags that define the type and scope of an account object.
      */
     public accountType?: number; 
}
export default Account;
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
import {DataObject} from '@themost/data/data-object';

/**
 * @class
 
 * @property {number} id
 * @property {string} sameAs
 * @property {string} url
 * @property {string} alternateName
 * @property {string} image
 * @property {string} additionalType
 * @property {string} name
 * @property {string} description
 * @property {Date} dateCreated
 * @property {Date} dateModified
 * @property {number} createdBy
 * @property {number} modifiedBy
 * @augments {DataObject}
 */
@EdmMapping.entityType('Thing')
class Thing extends DataObject {
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
module.exports = Thing;
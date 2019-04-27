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
 */
@EdmMapping.entityType('Thing')
class Thing extends DataObject {

     /**
      * @description The identifier of the item.
      */
    public id: number;

     /**
      * @description URL of a reference Web page that unambiguously indicates the item's identity.
      * E.g. the URL of the item's Wikipedia page, Freebase page, or official website.
      */
    public sameAs?: string;

     /**
      * @description URL of the item.
      */
    public url?: string;

     /**
      * @description An alias for the item.
      */
    public alternateName?: string;

     /**
      * @description An image of the item. This can be a <a class="localLink" href="/URL">URL</a>
      * or a fully described <a class="localLink" href="/ImageObject">ImageObject</a>.
      */
    public image?: string;

     /**
      * @description An additional type for the item, typically used for adding more specific types
      * from external vocabularies in microdata syntax. This is a relationship between something
      * and a class that the thing is in. In RDFa syntax, it is better to use the native RDFa syntax
      * - the 'typeof' attribute - for multiple types. Schema.org tools may have only weaker
      * understanding of extra types, in particular those defined externally.
      */
    public additionalType?: string;

     /**
      * @description The name of the item.
      */
    public name?: string;

     /**
      * @description A description of the item.
      */
    public description?: string;

     /**
      * @description The date on which this item was created.
      */
    public dateCreated?: Date;

     /**
      * @description The date on which this item was most recently modified.
      */
    public dateModified?: Date;

     /**
      * @description Created by user.
      */
    public createdBy?: number;

     /**
      * @description Modified by user.
      */
    public modifiedBy?: number;
    /**
     * @constructor
     */
    constructor() {
        super();
    }

}
export default Thing;

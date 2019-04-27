import {EdmMapping} from '@themost/data/odata';
import Account from './account-model';

/**
 * @class

 * @property {number} id
 * @property {Array<Account|any>} members
 * @augments {DataObject}
 */
@EdmMapping.entityType('Group')
class Group extends Account {

    /**
     * @description The identifier of the item.
     */
     public id: number = 0;

     /**
      * @description Contains the collection of group members (users or groups).
      */
     public members?: Account[];
    /**
     * @constructor
     */
    constructor() {
        super();
    }
}
export default Group;

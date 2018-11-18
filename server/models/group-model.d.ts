import {EdmMapping,EdmType} from '@themost/data/odata';
import Account = require('./account-model');

/**
 * @class
 */
declare class Group extends Account {

     
     /**
      * @description The identifier of the item.
      */
     public id: number; 
     
     /**
      * @description Contains the collection of group members (users or groups).
      */
     public members?: Array<Account|any>; 

}

export = Group;
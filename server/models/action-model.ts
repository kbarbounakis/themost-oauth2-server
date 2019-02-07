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
import * as moment from 'moment';
import Thing from './thing-model';

@EdmMapping.entityType('Action')
class Action extends Thing {
    constructor() {
        super();
        this.selector('overdue', (callback)=> {
            if (this.hasOwnProperty('endTime')) {
                const endTime = moment(this.endTime);
                if (endTime.isValid()) {
                    return callback(null, endTime.toDate()<(new Date()));
                }
            }
            return this.getModel()
                .where('id').equal(this.getId())
                .silent()
                .select('endTime').value().then((value)=> {
                    const endTime = moment(value);
                    if (endTime.isValid()) {
                        return callback(null, endTime.toDate()<(new Date()));
                    }
                    return callback(null, false);
                }).catch((err) => {
                return callback(err);
            });
        });
    }
    
    public actionStatus: any;
    
    public target: any;
    
    public owner: any;
    
    public agent: any;
    
    public object: any;
    
    public startTime?: Date;
    
    public endTime?: Date;

    isOverdue() {
        return this.is(':overdue');
    }

}

export default Action;
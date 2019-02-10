/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {TraceUtils} from '@themost/common/utils';
import {getMailer} from '@themost/mailer';
import {DataEventArgs} from '@themost/data'
import Action from '../models/action-model';
/**
 *
 * @param {DataEventArgs} event
 * @param {Function} callback
 */
export function afterSave(event: DataEventArgs, callback: (err?: Error) => void) {

    if (event.state === 1) {
        const context = event.model.context;
        const target  = event.target as Action;
        return getMailer(context)
            .to(target.object.name)
            .subject('Password Reminder (theMOST Authentication Services)')
            .template('reminder').send(event.target, (err) => {
                if (err) {
                    TraceUtils.error('An error occurred while sending password reminder message ' +
                        'for password reset action with ID:' + target.id);
                }
                return callback(err);
        });
    }
    return callback();

}

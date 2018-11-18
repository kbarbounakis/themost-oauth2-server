/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {TraceUtils} from '@themost/common/utils';
import mailer from '@themost/mailer';
/**
 *
 * @param {DataEventArgs} event
 * @param {Function} callback
 */
export function afterSave(event, callback) {

    if (event.state === 1) {
        const context = event.model.context;
        return mailer.getMailer(context)
            .to(event.target.object.name)
            .subject('Password Reminder (theMOST Authentication Services)')
            .template('reminder').send(event.target, (err) => {
                if (err) {
                    TraceUtils.error('An error occured while sending password reminder message for password reset action with ID:' + event.target.id);
                }
                return callback(err);
        });
    }
    return callback();

}
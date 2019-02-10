/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {HttpBaseController} from '@themost/web';
import {TraceUtils, RandomUtils, TextUtils} from '@themost/common/utils';
import {HttpViewResult} from '@themost/web/mvc';
import {httpGet, httpPost, httpAction, httpParam, httpController} from '@themost/web/decorators';
import * as moment from 'moment';
import * as _ from 'lodash';

/**
 * @class
 */
@httpController()
class ResetPasswordActionController extends HttpBaseController {

    /**
     * @constructor
     */
    constructor() {
        super();
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction('reminder')
    @httpGet()
    public getPasswordReminder(): Promise<any> {
        return Promise.resolve(this.view());
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction('reminder')
    @httpPost()
    @httpParam({ name: 'email', type: 'Email', required: true })
    public postPasswordReminder(email): Promise<any> {
        const self = this;
        return new Promise((resolve, reject) => {
            self.context.validateAntiForgeryToken();
            self.context.model('User').where('name').equal(email).silent().getItem().then((user) => {
                if (_.isNil(user)) {
                    return resolve(self.result({code: 'EFAIL', message: 'The email address you entered does not match with our records. ' +
                    'Please be sure that you have typed the email address you used when you registered.'}));
                }
                return self.context.model('ActionStatusType').where('alternateName').equal('ActiveActionStatus').getItem().then(() => {
                    return self.context.model('ResetPasswordAction')
                        .where('object').equal(user.id)
                        .and('actionStatus/alternateName').equal('ActiveActionStatus')
                        .silent()
                        .getTypedItem().then((action) => {
                            if (_.isObject(action)) {
                                return action.isOverdue().then((overdue) => {
                                    if (overdue) {
                                        action.actionStatus = {
                                            alternateName: 'CancelledActionStatus'
                                        };
                                        return action.silent().save().then(() => {
                                            // add action
                                            action = {
                                                startTime: new Date(),
                                                endTime: moment().add(60, 'minutes').toDate(),
                                                object: user,
                                                actionStatus: {
                                                    alternateName: 'ActiveActionStatus'
                                                },
                                                url: '/password/reset?code=' + RandomUtils.randomChars(36)
                                            };
                                            return self.context.model('ResetPasswordAction').silent().save(action).then(() => {
                                                return resolve(new HttpViewResult('reminder-completed', {code: 'ESUCC'}));
                                            }).catch((err) => {
                                                reject(err);
                                            });
                                        }).catch((err) => {
                                            reject(err);
                                        });
                                    } else {
                                        return resolve(self.result({code: 'EFAIL',
                                            message: 'You have already requested a password reset action. ' +
                                            'Check your email for password reset verification message. If you did not receive any message' +
                                                ', please try again later. If the problem persists, contact us.'}));
                                    }
                                });
                            }
                            // add action
                            action = {
                                startTime: new Date(),
                                endTime: moment().add(60, 'minutes').toDate(),
                                object: user,
                                url: '/password/reset?code=' + RandomUtils.randomChars(36)
                            };
                            return self.context.model('ResetPasswordAction').silent().save(action).then(() => {
                                return resolve(new HttpViewResult('reminder-completed', {code: 'ESUCC'}));
                            });
                        });
                });

            }).catch((err) => {
                TraceUtils.error(err);
                resolve(self.result({code: 'EFAIL', message: 'An error occured while trying to complete your request.'}));
            });
        });
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction('reset')
    @httpGet()
    public getPasswordReset(code) {
        const self = this;
        return new Promise((resolve) => {
            return self.context.model('ActionStatusType').where('alternateName').equal('ActiveActionStatus').getItem().then(() => {
                return self.context.model('ResetPasswordAction')
                    .where('url').equal(`/password/reset?code=${code}`)
                    .and('actionStatus/alternateName').equal('ActiveActionStatus')
                    .silent().getItem().then((result) => {
                        if (_.isNil(result)) {
                            return resolve(new HttpViewResult('reset-invalid', { code: 'EFOUND'}));
                        }
                        if (!_.isNil(result.endTime) && (moment(result.endTime).toDate() < (new Date()))) {
                            return resolve(new HttpViewResult('reset-invalid', { code: 'EEXPIRED'}));
                        }
                        resolve(self.view());
                    });
            }).catch((err) => {
                TraceUtils.error(err);
                resolve(self.view({code: 'EFAIL', message: 'An error occured while trying to initialize a user action.'}));
            });

        });
    }

    // noinspection JSUnusedLocalSymbols
    /**
     * @returns {Promise|*}
     */
    @httpAction('reset')
    @httpPost()
    @httpParam({ name: 'code', type: 'Text', required: true, pattern: '^[a-zA-Z0-9]{36}$' })
    @httpParam({ name: 'newPassword', type: 'Password', required: true, })
    @httpParam({ name: 'confirmPassword', type: 'Password', required: true, })
    public postPasswordReset(code: string, newPassword: string, confirmPassword: string): Promise<any> {
        const self = this;
        return new Promise((resolve) => {
            self.context.model('ActionStatusType').where('alternateName').equal('ActiveActionStatus').getItem().then(() => {
                return self.context.model('ResetPasswordAction')
                    .where('url').equal(`/password/reset?code=${code}`)
                    .and('actionStatus/alternateName').equal('ActiveActionStatus')
                    .silent().getTypedItem().then((action) => {
                    if (_.isNil(action)) {
                        return resolve(new HttpViewResult('reset-invalid', { code: 'EFOUND'}));
                    }
                    if (!_.isNil(action.endTime) && (moment(action.endTime).toDate() < (new Date()))) {
                        return resolve(new HttpViewResult('reset-invalid', { code: 'EEXPIRED'}));
                    }
                    // reset password
                    return self.context.model('UserCredential').where('id').equal(action.object).silent().getItem().then((credentials) => {
                        if (_.isObject(credentials)) {
                            return self.context.model('UserCredential').silent().save({
                                id: credentials.id,
                                userPassword: '{md5}' + TextUtils.toMD5(newPassword)
                            }).then(() => {
                                // complete action
                                action.actionStatus = {
                                    alternateName: 'CompletedActionStatus'
                                };
                                action.endTime = new Date();
                                return action.silent().save().then(() => {
                                    return resolve(new HttpViewResult('reset-completed', { code: 'ESUCC'}));
                                });
                            });
                        } else {
                            resolve(self.view({code: 'EFAIL', message: 'An error occured while trying to validate user action.'}));
                        }
                    }).catch((err) => {
                        TraceUtils.error(err);
                        resolve(self.view({code: 'EFAIL', message: 'An error occured while trying to validate user action.'}));
                    });

                }).catch((err) => {
                    TraceUtils.error(err);
                    resolve(self.view({code: 'EFAIL', message: 'An error occured while trying to initialize a user action.'}));
                });
            }).catch((err) => {
                TraceUtils.error(err);
                resolve(self.view({code: 'EFAIL', message: 'An error occured while trying to initialize a user action.'}));
            });
        });
    }

}

export default ResetPasswordActionController;

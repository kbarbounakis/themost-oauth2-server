/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import * as _ from 'lodash';
import {TextUtils, TraceUtils, LangUtils} from '@themost/common/utils';
import {AuthStrategy} from '@themost/web/handlers/auth';
import * as moment from 'moment';
import {HttpContext} from '@themost/web';
import {InvalidClientError, InvalidCredentialsError, InvalidScopeError} from '../errors';

const contextProperty = Symbol('context');
const clientProperty = Symbol('client_id');
const scopeProperty = Symbol('scope');
/**
 * @private
 * @param {LoginService} thisService
 * @param {string} username
 * @param {string} password
 * @returns {Promise<*>}
 */
function validate(thisService: LoginService, username: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
        thisService.getContext().model('User').silent()
            .where('name').equal(username)
            .select('id', 'name')
            .getItem().then((user) => {
            if (_.isNil(user)) {
                return resolve();
            }
            return thisService.getContext().model('UserCredential')
                .silent()
                .where('userPassword').equal('{clear}'.concat(password))
                .or('userPassword').equal('{md5}' + TextUtils.toMD5(password))
                .or('userPassword').equal('{sha1}' + TextUtils.toSHA1(password))
                .prepare()
                .and('id').equal(user.id).count().then((exists) => {
                    if (exists) {
                        return resolve(user);
                    }
                    return resolve();
                });
        }).catch((err) => {
            return reject(err);
        });
    });
}

export class LoginService {

    /**
     * @param {HttpContext} context
     * @param {string=} client_id
     * @param {string=} scope
     */
    constructor(context: HttpContext, client_id?: string, scope?: string) {
        this[contextProperty] = context;
        this[clientProperty] = client_id;
        this[scopeProperty] = scope || 'profile';
    }

    public getContext() {
        return this[contextProperty];
    }

    public setClient(client_id) {
        this[clientProperty] = client_id;
        return this;
    }

    public getClient() {
        return this[clientProperty];
    }

    public getScope() {
        return this[scopeProperty];
    }

    public login(userName: string, userPassword: string): Promise<any> {
        const self = this;
        return new Promise( (resolve, reject) => {
            const client_id = self.getClient();
            const scope = self.getScope();
            self.getContext().model('AuthClient').silent().where('client_id').equal(client_id).getItem().then((client) => {
                if (_.isNil(client)) {
                    return reject(new InvalidClientError());
                }
                // validate scopes
                // split scopes
                const scopes = scope.split(' ');
                return self.getContext().model('AuthScope')
                    .where('name').equal(scopes)
                    .silent()
                    .cache(true).getItems()
                    .then((returnedScopes) => {
                    if (returnedScopes.length !== scopes.length) {
                        return reject(new InvalidScopeError());
                    }
                    // validate credentials
                    return validate(self, userName, userPassword).then((user) => {
                        if (_.isNil(user)) {
                            // authentication failed
                            return reject(new InvalidCredentialsError());
                        }
                        // get expiration timeout
                        const configuration = self.getContext().getApplication().getConfiguration();
                        const expirationTimeout = (LangUtils.parseInt(configuration.settings.auth.timeout) || 480) * 60 * 1000;
                        // calculate expiration time
                        const expires = moment(new Date()).add(expirationTimeout, 'ms').toDate();
                        // get access tokens model
                        const accessTokens = self.getContext().model('AccessToken');
                        // create new token (for the specified client)
                        const token = {
                            client_id,
                            user_id: user.name,
                            expires,
                            scope
                        };
                        return accessTokens.where('client_id').equal(client_id)
                            .and('user_id').equal(user.name)
                            .and('expires').greaterThan(new Date()).silent()
                            .and('scope').equal(scope)
                            .getTypedItem().then((accessToken) => {
                                if (_.isObject(accessToken)) {
                                    self.getContext().getApplication()
                                        .getStrategy(AuthStrategy)
                                        .setAuthCookie(self.getContext(), user.name);
                                    accessToken.expires = moment(accessToken.expires).toDate();
                                    return resolve(accessToken);
                                }
                                // save token
                                return accessTokens.silent().save(token).then(() => {
                                    // set auth cookie
                                    self.getContext().getApplication()
                                        .getStrategy(AuthStrategy)
                                        .setAuthCookie(self.getContext(), user.name);
                                    return resolve(token);
                                });
                            });
                    });
                });
            }).catch((err) => {
                TraceUtils.error(err);
                return reject(new Error('Login failed due to identity server error.'));
            });
        });


    }

    public logout() {
        this.getContext().getApplication()
            .getStrategy(AuthStrategy)
            .setAuthCookie(this.getContext(), 'anonymous', { expires: new Date(1970, 1, 1) });
        return Promise.resolve();
    }
}
/**
 * @param {HttpContext} context
 * @returns {LoginService}
 */
export function createInstance(context: HttpContext): LoginService {
    return new LoginService(context);
}

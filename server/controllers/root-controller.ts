/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {HttpBaseController} from '@themost/web';
import {HttpResult} from '@themost/web/mvc';
import {AuthStrategy, EncryptionStrategy} from '@themost/web/handlers/auth';
import {TraceUtils } from '@themost/common/utils';
import * as _ from 'lodash';
import {httpGet, httpAction, httpController, httpParam, httpPost} from '@themost/web/decorators';
import {LoginService} from '../services/login-service';
import {InvalidCredentialsError} from '../errors';
import {
    IdentityServerError, InvalidDataError, LoginServerError,
    OutdatedDataError,
    UnknownUsernameOrPasswordError,
    ValidateCredentialsError
} from '../errors';

import {IncomingMessage} from 'http';

interface IncomingMessageQuery extends IncomingMessage {
    query: any;
}

/**
 * @augments {HttpController}
 */
@httpController()
class RootController extends HttpBaseController {

    /**
     * @constructor
     */
    constructor() {
        super();
    }

    @httpAction('logout')
    @httpGet()
    @httpPost()
    public async getLogout(): Promise<HttpResult> {
        // set auth cookie to nothing
        this.context.getApplication().getStrategy(AuthStrategy).setAuthCookie(this.context, 'anonymous', { expires: new Date(1970, 1, 1) });
        // cast request object
        const request = this.context.request as IncomingMessageQuery;
        // redirect to home or continue URI
        return this.redirect(request.query.continue || this.context.getApplication().resolveUrl('~/'));
    }

    @httpAction('index')
    @httpGet()
    public async getIndex(): Promise<HttpResult> {
        return this.view();
    }

    // noinspection JSUnusedLocalSymbols
    /**
     * @returns {Promise|*}
     */
    @httpAction('login')
    @httpParam({ name: 'client_id', type: 'Text', pattern: /^[a-zA-Z0-9]+$/, maxLength: 48 })
    @httpParam({ name: 'redirect_uri', type: 'Text', maxLength: 256 })
    @httpParam({ name: 'response_type', type: 'Text', pattern: /^(code|token)$/, maxLength: 48 })
    @httpParam({ name: 'scope', type: 'Text', pattern: /[a-zA-Z0-9\s.\-+_]+$/, maxLength: 128 })
    @httpGet()
    public async getLogin(client_id: string, response_type?: string, redirect_uri?: string, scope?: string): Promise<HttpResult> {
        try {
            const authorization_id = this.context.getApplication().getConfiguration().settings.auth.client_id;
            const request_client_id = client_id || authorization_id;
            // get client
            const client = await this.context.model('AuthClient').silent()
                .where('client_id').equal(request_client_id)
                .expand('scopes')
                .getTypedItem();
            // if client is undefined
            if (typeof client === undefined) {
                // return an outdated data error (400 - Bad Request)
                return this.view(new OutdatedDataError()).status(400);
            }
            // extract user data from auth cookie
            const userData = JSON.parse(this.context.getApplication().getStrategy(AuthStrategy).getAuthCookie(this.context));
            if (userData) {
                // get user
                const user = await this.context.model('User').silent().where('name').equal(userData.user).select('id', 'name').getItem();
                if (typeof user === 'undefined') {
                    // throw error for invalid credentials (401 - Unauthorized)
                    return this.view(new ValidateCredentialsError()).status(401);
                }
                // get active access token
                const token = await this.context.model('AccessToken')
                                        .where('client_id').equal(client_id)
                                        .and('user_id').equal(user.name)
                                        .and('expires').greaterThan(new Date())
                                        .silent()
                                        .getItem();
                // if there is no active access token
                if (typeof token === 'undefined') {
                    // return to view
                    return this.view();
                }
                // validate client
                if (client_id === authorization_id) {
                    // if client is equal to authorization server redirect to user page
                    return this.redirect(this.context.getApplication().resolveUrl('~/user'));
                }
                // validate redirect uri
                if (redirect_uri && !client.hasRedirectUri(redirect_uri)) {
                    TraceUtils.error(`Invalid redirect uri for client ${client.client_id}, redirect_uri=${redirect_uri}`);
                    // throw error for invalid redirect uri
                    return this.view(new InvalidDataError()).status(400);
                }
                // if response type is equal to token (implicit grant)
                if (response_type === 'token') {
                    // validate grant type
                    if (!client.hasGrantType(response_type)) {
                        // and throw error of client does not allow to use the specified grant type
                        return this.view(new OutdatedDataError('EGRANT')).status(401);
                    }
                    // redirect to the specified redirect uri with the access token
                    /* tslint:disable-next-line max-line-length */
                    return this.redirect(`${(redirect_uri || client.redirect_uri)}?response_type=token&access_token=${token.access_token}&token_type=bearer`);
                }
                // get encrypted access token
                const encryptedToken =  this.context.getApplication().getStrategy(EncryptionStrategy).encrypt(token.access_token);
                // use authorization code flow and redirect user to the given redirect uri
                return this.redirect((redirect_uri || client.redirect_uri) + '?response_type=code&code=' + encryptedToken);
            } else {
                // get client scope
                const hasScope = await client.hasScope(scope || 'profile');
                // if client has the defined scope
                if (hasScope) {
                    return this.view();
                }
                // otherwise return an outdated data error (401 - Unathorized)
                return this.view(new OutdatedDataError()).status(401);
            }
        } catch (err) {
            TraceUtils.error(err);
            return this.view(new IdentityServerError()).status(500);
        }
    }

    @httpAction('login')
    @httpPost()
    @httpParam({ name: 'client_id', type: 'Text', pattern: /^[a-zA-Z0-9]+$/, maxLength: 48 })
    @httpParam({ name: 'redirect_uri', type: 'Text', maxLength: 256 })
    @httpParam({ name: 'response_type', type: 'Text', pattern: /^(code|token)$/, maxLength: 48 })
    @httpParam({ name: 'scope', type: 'Text', pattern: /[a-zA-Z0-9\s.\-+_]+$/, maxLength: 128 })
    public postLogin(client_id, redirect_uri, response_type, credentials, scope) {
        const self = this;
        const authorization_id = self.context.getApplication().getConfiguration().settings.auth.client_id;
        const request_client_id = client_id || authorization_id;
        return new Promise((resolve) => {
            try {
                // validate anti-forgery token
                self.context.validateAntiForgeryToken();
                // 1. Validate Client ID
                if (!/^\d+$/.test(request_client_id)) {
                    return resolve(self.view(new InvalidDataError()).status(405));
                }
                // 2. Get Client Data
                self.context.model('AuthClient').silent()
                    .where('client_id').equal(request_client_id)
                    .expand('scopes').getTypedItem()
                    .then((client) => {
                    if (_.isNil(client)) {
                        return resolve(self.view(new OutdatedDataError()).status(401));
                    }
                    if (response_type && !client.hasGrantType(response_type)) {
                        return resolve(self.view(new OutdatedDataError()).status(400));
                    }
                    if (_.isNil(scope) && client.scopes && client.scopes.length) {
                        scope = client.scopes.map( (x) => x.name).join(',');
                    }
                    if (_.isNil(scope)) {
                        TraceUtils.error(`Missing scope for client ${client.client_id}, redirect_uri=${redirect_uri}`);
                        return resolve(self.view(new OutdatedDataError()).status(401));
                    }
                    // validate redirect_uri
                    if (redirect_uri && !client.hasRedirectUri(redirect_uri)) {
                        TraceUtils.error(`Invalid redirect uri for client ${client.client_id}, redirect_uri=${redirect_uri}`);
                        return resolve(self.view(new InvalidDataError()).status(400));
                    }
                    // validate scopes
                    return client.hasScope(scope).then((hasScope) => {
                        if (hasScope) {
                            const loginService = new LoginService(self.context, request_client_id, scope);
                            return loginService.login(credentials.username, credentials.password).then( (token) => {
                                if (_.isNil(client_id)) {
                                    return resolve(self.redirect(self.context.getApplication().resolveUrl('~/user')));
                                } else {
                                    if (response_type === 'token') {
                                        /* tslint:disable-next-line max-line-length */
                                        return resolve(self.redirect(`${(redirect_uri || client.redirect_uri)}?response_type=token&access_token=${token.access_token}&token_type=bearer`));
                                    }
                                    /* tslint:disable-next-line max-line-length */
                                    return resolve(self.redirect((redirect_uri || client.redirect_uri) + '?response_type=code&code=' + self.context.getApplication().getStrategy(EncryptionStrategy).encrypt(token.access_token)));
                                }
                            }).catch( (err) => {
                                if (err instanceof InvalidCredentialsError) {
                                    return resolve(self.view(new UnknownUsernameOrPasswordError(credentials.username)).status(401));
                                }
                                TraceUtils.error(err);
                                return resolve(self.view(new LoginServerError(credentials && credentials.username)).status(500));
                            });
                        }
                        TraceUtils.error(`Invalid scope for client ${client.client_id}, redirect_uri=${redirect_uri}, scope=${scope}`);
                        return resolve(self.view(new InvalidDataError()).status(400));
                    });
                }).catch((err) => {
                    TraceUtils.error(err);
                    return resolve(self.view(new LoginServerError(credentials && credentials.username)));
                });
            } catch (err) {
                TraceUtils.error(err);
                return resolve(self.view(new LoginServerError(credentials && credentials.username)));
            }
        });
    }


}

export default RootController;

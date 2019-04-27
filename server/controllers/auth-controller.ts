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
import {EncryptionStrategy, AuthStrategy} from '@themost/web';
import {TraceUtils} from '@themost/common/utils';
import * as moment from 'moment';
import * as _ from 'lodash';
import {httpGet, httpPost, httpAction, httpParam, httpController} from '@themost/web/decorators';
import {LoginService} from '../services/login-service';
import {InvalidClientError, InvalidCredentialsError, OutdatedDataError, InvalidDataError, IdentityServerError, ValidateCredentialsError, LoginServerError, UnknownUsernameOrPasswordError} from '../errors';


import {IncomingMessage} from 'http';

interface IncomingMessageQuery extends IncomingMessage {
    query: any;
}

const AuthControllerMessages = {
    serverError: {
        code: 500,
        error: 'server_error',
        error_description: 'Internal server error.'
    },
    invalidRequest: {
        code: 500,
        error: 'server_error',
        error_description: 'Method not allowed.'
    },
    invalidToken: {
        code: 400,
        error: 'invalid_token',
        error_description: 'Token is invalid.'
    },
    tokenNotFound: {
        code: 404,
        error: 'invalid_request',
        error_description: 'The specified token was not found.'
    },
    profileNotFound: {
        code: 400,
        error: 'invalid_request',
        error_description: 'User profile was not found.'
    },
    tokenExpired: {
        code: 400,
        error: 'invalid_request',
        error_description: 'Token was expired.'
    },
    invalidData: {
        code: 400,
        error: 'invalid_client',
        error_description: 'Invalid client data.'
    },
    invalidGrant: {
        code: 400,
        error: 'invalid_grant',
        error_description: 'Invalid grant type.'
    },
    invalidScope: {
        code: 400,
        error: 'invalid_scope',
        error_description: 'Invalid scope.'
    },
    invalidCredentials: {
        code: 401,
        error: 'invalid_credentials',
        error_description: 'Unknown username or bad password.'
    }
};

/**
 * @augments {HttpController}
 */
@httpController()
class AuthController extends HttpBaseController {

    /**
     * @constructor
     */
    constructor() {
        super();
    }
    
    @httpAction("index")
    @httpGet()
    async getIndex(): Promise<HttpResult> {
        let request = this.context.request as IncomingMessageQuery;
        if (request.query.lang) {
            //change language
            let cultures = this.context.getApplication().getConfiguration().getSourceAt('settings/localization/cultures');
            if (Array.isArray(cultures)) {
                let culture = cultures.find(x =>{
                   return x.substr(0,2) === request.query.lang;
                });
                if (culture) {
                    this.context.setCookie('.LANG', culture, moment().add(1,'year').toDate());
                    // get referer
                    let referer = this.context.request.headers['referer'];
                    if (typeof referer === 'string') {
                        return this.redirect(referer);
                    }
                    // redirect to hone
                    return this.redirect(this.context.getApplication().resolveUrl('~/auth/login'));
                }
            }
        }
        return this.view();
    }
    
    /**
     * @returns {Promise|*}
     */
    @httpAction('me')
    @httpGet()
    @httpParam({ name: 'access_token', type: 'Text', pattern: /^[a-zA-Z0-9]+$/, maxLength: 255 })
    public async getMe(access_token: string): Promise<HttpResult> {
        try {
            // if access token is missing search for Authorization:Bearer [Access Token] header
            if (_.isNil(access_token)) {
                const authorizationHeader = this.context.request.headers.authorization;
                if (_.isString(authorizationHeader)) {
                    if (/^Bearer\s+/.test(authorizationHeader)) {
                        access_token = authorizationHeader.replace(/^Bearer\s+/, '');
                    }
                }
            }
            // get access token
            const token = await this.context.model('AccessToken').where('access_token').equal(access_token).silent().getItem();
            if (typeof token === 'undefined') {
                return this.json(AuthControllerMessages.tokenNotFound).status(AuthControllerMessages.tokenNotFound.code);
            }
            if (token.expires) {
                return this.json(AuthControllerMessages.tokenExpired).status(400);
            }
            // get user
            const user = await this.context.model('User').where('name').equal(token.user_id).silent().getItem();
            if (typeof user === 'undefined') {
                return this.json(AuthControllerMessages.profileNotFound).status(400);
            }
            return this.json({ id: user.id, name: user.name });
        } catch (err) {
            TraceUtils.error(err);
            return this.json(AuthControllerMessages.serverError).status(500);
        }
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction('tokeninfo')
    @httpPost()
    @httpParam({ name: 'access_token', type: 'Text', pattern: /^[a-zA-Z0-9]+$/, maxLength: 255 })
    public async postTokenInfo(access_token: string): Promise<HttpResult> {
        try {
            // get access_token attribute
            const access_token_attr = this.context.model('AccessToken').field('access_token');
            // validate access_token attribute size
            if (access_token_attr.size && access_token.length > access_token_attr.size) {
                return this.json(AuthControllerMessages.tokenNotFound).status(AuthControllerMessages.tokenNotFound.code);
            }
            // get token
            const token = await this.context.model('AccessToken').where('access_token').equal(access_token).silent().cache(true).getItem();
            if (typeof token === 'undefined') {
                return this.json(AuthControllerMessages.tokenNotFound).status(AuthControllerMessages.tokenNotFound.code);
            }
            const now = new Date();
            const expires = moment(token.expires);
            // set new access token
            const result = {
                active: expires.diff(now) > 0,
                scope: token.scope,
                client_id: token.client_id,
                username: token.user_id,
                exp: expires.diff(moment('1970-01-01'), 'seconds')
            };
            // return token
            return this.json(result);
        } catch (err) {
            TraceUtils.error(err);
            return this.json(AuthControllerMessages.serverError).status(AuthControllerMessages.serverError.code);
        }
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction('access_token')
    @httpGet()
    @httpPost()
    @httpParam({ name: 'client_id', type: 'Text', pattern: /^[a-zA-Z0-9]+$/, maxLength: 48 })
    @httpParam({ name: 'client_secret', type: 'Text', pattern: /^[a-zA-Z0-9]+$/, maxLength: 48 })
    @httpParam({ name: 'code', type: 'Text', pattern: /^[a-zA-Z0-9]+$/, maxLength: 128 })
    public async getAccessToken(client_id: string, client_secret: string, code: string): Promise<HttpResult> {
        try {
            // validate client
            const count = await this.context.model('AuthClient').where('client_id').equal(client_id)
                                        .and('client_secret').equal(client_secret)
                                        .silent()
                                        .count();
            if (count === 0) {
                return this.json(AuthControllerMessages.invalidData).status(AuthControllerMessages.invalidData.code);
            }
            // get access token
            const token = await this.context.model('AccessToken')
                            .where('access_token')
                            .equal(this.context.getApplication().getStrategy(EncryptionStrategy).decrypt(code))
                            .silent()
                            .getItem();
            // if token does exist
            if (typeof token === 'undefined') {
                // throw error
                return this.json(AuthControllerMessages.tokenNotFound).status(AuthControllerMessages.tokenNotFound.code);
            }
            return this.json({
                        access_token: token.access_token,
                        expires: token.expires,
                        refresh_token: token.refresh_token,
                        token_type: 'bearer',
                        scope: token.scope
                    }).status(200);
        } catch (err) {
            TraceUtils.error(err);
            return this.json(AuthControllerMessages.serverError).status(AuthControllerMessages.serverError.code);
        }
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction('authorize')
    @httpGet()
    @httpParam({ name: 'client_id', type: 'Text', pattern: /^[a-zA-Z0-9]+$/, maxLength: 48 })
    @httpParam({ name: 'redirect_uri', type: 'Text', maxLength: 256 })
    @httpParam({ name: 'response_type', type: 'Text', pattern: /^[a-zA-Z0-9]+$/, maxLength: 48 })
    @httpParam({ name: 'scope', type: 'Text', pattern: /[a-zA-Z0-9\s.\-+_]+$/, maxLength: 128 })
    public async getAuthorize(client_id: string, redirect_uri: string, response_type?: string, scope?: string): Promise<HttpResult> {
        try {
            // get client
            const client = await this.context.model('AuthClient')
                .where('client_id').equal(client_id)
                .silent()
                .expand('scopes')
                .getTypedItem();
            if (typeof client === 'undefined') {
                return this.view(AuthControllerMessages.invalidData).setName('error').status(400);
            }
            if (!client.hasGrantType(response_type)) {
                return this.view(AuthControllerMessages.invalidGrant).setName('error').status(400);
            }
            if (redirect_uri && !client.hasRedirectUri(redirect_uri)) {
                return this.view(AuthControllerMessages.invalidData).setName('error').status(400);
            }
            // get redirect uri
            redirect_uri = redirect_uri || client.redirect_uri;
            // get already defined client scopes
            let clientScope;
            if (client.scopes && client.scopes.length) {
                // create a comma separated list of client scopes
                clientScope = client.scopes.map( (x) => x.name).join(',');
            }
            // get scope from request or scopes associated with this client or the default profile scope
            scope = scope || clientScope || 'profile';
            // validate scope
            const hasScope = await client.hasScope(scope);
            if (hasScope) {
                /* tslint:disable-next-line max-line-length */
                return this.redirect(this.context.getApplication().resolveUrl(`~/login?response_type=${response_type}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_id=${client_id}&scope=${scope}`));
            }
            // throw error of invalid scope
            return this.view(AuthControllerMessages.invalidScope).status(400);
        } catch (err) {
            TraceUtils.error(err);
            return this.view(AuthControllerMessages.serverError).status(500);
        }
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction('authorize')
    @httpPost()
    @httpParam({ name: 'grant_type', type: 'Text', pattern: /^password|client_credentials$/ })
    @httpParam({ name: 'client_id', type: 'Text', pattern: /^[a-zA-Z0-9]+$/, maxLength: 48 })
    @httpParam({ name: 'client_secret', type: 'Text', pattern: /^[a-zA-Z0-9]+$/, maxLength: 48 })
    @httpParam({ name: 'scope', type: 'Text', pattern: /^[a-zA-Z.\s,]+$/, maxLength: 256 })
    @httpParam({ name: 'username', type: 'Text', maxLength: 128 })
    @httpParam({ name: 'password', type: 'Text', maxLength: 128 })
    public async postAuthorize(grant_type: string, client_id: string,
                               client_secret: string, scope: string,
                               username: string, password: string): Promise<HttpResult> {
        try {
                // validate scope
            if (typeof scope === 'undefined') {
                return this.json(AuthControllerMessages.invalidScope).status(400);
            }
            // get client
            const client = await this.context.model('AuthClient')
                                            .where('client_id').equal(client_id)
                                            .and('client_secret').equal(client_secret).silent().getTypedItem();
                    //
            if (typeof client === 'undefined') {
                return this.json(AuthControllerMessages.invalidData).status(400);
            }
            if (!client.hasGrantType(grant_type)) {
                return this.json(AuthControllerMessages.invalidGrant).status(400);
            }

            const hasScope = await client.hasScope(scope);
            if (hasScope) {
                const loginService = new LoginService(this.context, client_id);
                // validate credentials
                try {
                    const token = await loginService.login(username, password);
                    // set response
                    return this.json({
                        token_type: 'Bearer',
                        expires_in: token.expires.getTime(),
                        access_token: token.access_token,
                        refresh_token: token.refresh_token,
                        scope: token.scope
                    });
                } catch (err) {
                    // handle error
                    if (err instanceof InvalidClientError) {
                        return this.json(AuthControllerMessages.invalidData).status(400);
                    } else if (err instanceof InvalidCredentialsError) {
                        return this.json(AuthControllerMessages.invalidCredentials).status(AuthControllerMessages.invalidCredentials.code);
                    }
                    return this.json(AuthControllerMessages.serverError).status(AuthControllerMessages.serverError.code);
                }
            }
            return this.json(AuthControllerMessages.invalidScope).status(400);
        } catch (err) {
            TraceUtils.error(err);
            return this.json(AuthControllerMessages.serverError).status(AuthControllerMessages.serverError.code);
        }

    }

    // noinspection JSUnusedLocalSymbols
    /**
     * @returns {Promise|*}
     */
    @httpAction("login")
    @httpParam({ name:"client_id", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:48 })
    @httpParam({ name:"redirect_uri", type:"Text",maxLength:256 })
    @httpParam({ name:"response_type", type:"Text",pattern:/^(code|token)$/,maxLength:48 })
    @httpParam({ name:"scope", type:"Text",pattern:/[a-zA-Z0-9\s.\-+_]+$/,maxLength:128 })
    @httpGet()
    async getLogin(client_id: string, response_type?: string, redirect_uri?: string, scope?: string): Promise<HttpResult> {
        try {
            const authorization_id = this.context.getApplication().getConfiguration().settings.auth['client_id'];
            let request_client_id = client_id || authorization_id;
            // get client
            let client = await this.context.model('AuthClient').silent().where('client_id').equal(request_client_id).expand('scopes').getTypedItem();   
            // if client is undefined
            if (typeof client === undefined) {
                // return an outdated data error (400 - Bad Request)
                return this.view(new OutdatedDataError()).status(400);
            }
            // extract user data from auth cookie
            let userData = JSON.parse(this.context.getApplication().getStrategy(AuthStrategy).getAuthCookie(this.context));
            if (userData) {
                // get user
                let user = await this.context.model('User').silent().where('name').equal(userData.user).select('id','name').getItem();
                if (typeof user === 'undefined') {
                    // throw error for invalid credentials (401 - Unauthorized)
                    return this.view(new ValidateCredentialsError()).status(401);
                }
                // get active access token
                let token = await this.context.model('AccessToken')
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
                    return this.redirect(`${(redirect_uri || client.redirect_uri)}?response_type=token&access_token=${token.access_token}&token_type=bearer`);
                }
                // get encypted access token
                let encryptedToken =  this.context.getApplication().getStrategy(EncryptionStrategy).encrypt(token.access_token);
                // use authorization code flow and redirect user to the given redirect uri
                return this.redirect((redirect_uri || client.redirect_uri) + '?response_type=code&code=' + encryptedToken);
            }
            else {
                // get client scope
                let hasScope = await client.hasScope(scope || 'profile');
                // if client has the defined scope
                if (hasScope) {
                    return this.view();
                }
                // otherwise return an outdated data error (401 - Unathorized)
                return this.view(new OutdatedDataError()).status(401);
            }
        }
        catch (err) {
            TraceUtils.error(err);
            return this.view(new IdentityServerError()).status(500);
        }
    }
    
    @httpAction("login")
    @httpPost()
    @httpParam({ name:"client_id", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:48 })
    @httpParam({ name:"redirect_uri", type:"Text",maxLength:256 })
    @httpParam({ name:"response_type", type:"Text",pattern:/^(code|token)$/,maxLength:48 })
    @httpParam({ name:"scope", type:"Text",pattern:/[a-zA-Z0-9\s.\-+_]+$/,maxLength:128 })
    async postLogin(client_id, redirect_uri, response_type, credentials, scope) {
        // get oauth2 server self client_id
        const authorization_id = this.context.getApplication().getConfiguration().settings.auth['client_id'];
        // get request client_id or oauth2 self assigned client_id
        const request_client_id = client_id || authorization_id;
        try {
            //validate anti-forgery token
            this.context.validateAntiForgeryToken();
            // validate Client ID
            if (!/^\d+$/.test(request_client_id)) {
                return this.view(new InvalidDataError()).status(405);
            }
            // get client
            const client = await this.context.model('AuthClient')
                    .silent()
                    .where('client_id').equal(request_client_id)
                    .expand('scopes')
                    .getTypedItem();
            // if client is undefined
            if (client == null) {
                // throw error for outdated data
                return this.view(new OutdatedDataError()).status(401);
            }
            // validate grant type
            if (response_type && !client.hasGrantType(response_type)) {
                // throw error if the specified grant type is not assigned to the client
                return this.view(new OutdatedDataError()).status(400);
            }
            // if a scope is not defined and client has scopes
            if (scope == null && client.scopes && client.scopes.length) {
                // get a concatenated string with client scopes for further validation
                scope = client.scopes.map( x => x.name).join(',');
            }
            // validate scope as string
            if (scope == null) {
                TraceUtils.error(`Missing scope for client ${client.client_id}, redirect_uri=${redirect_uri}`);
                return this.view(new OutdatedDataError()).status(401);
            }
            // validate redirect_uri
            if (redirect_uri && !client.hasRedirectUri(redirect_uri)) {
                TraceUtils.error(`Invalid redirect uri for client ${client.client_id}, redirect_uri=${redirect_uri}`);
                return this.view(new InvalidDataError()).status(400);
            }
            const hasScope = await client.hasScope(scope);
            if (hasScope) {
                // get login service for current context
                const loginService = new LoginService(this.context, request_client_id,scope);
                // validate credentials
                try {
                    let token = await loginService.login(credentials.username,credentials.password);  
                    if (client_id == null) {
                        // redirect to default page
                        return this.redirect(this.context.getApplication().resolveUrl('~/user'));
                        if (response_type === 'token') {
                            return this.redirect(`${(redirect_uri || client.redirect_uri)}?response_type=token&access_token=${token.access_token}&token_type=bearer`);
                        }
                        return this.redirect((redirect_uri || client.redirect_uri) + '?response_type=code&code=' + this.context.getApplication().getStrategy(EncryptionStrategy).encrypt(token.access_token));
                    }
                }
                catch (err) {
                    if (err instanceof InvalidCredentialsError) {
                        return this.view(new UnknownUsernameOrPasswordError(credentials.username)).status(401);
                    }
                    throw err;
                }
            }
            TraceUtils.error(`Invalid scope for client ${client.client_id}, redirect_uri=${redirect_uri}, scope=${scope}`);
            return this.view(new InvalidDataError()).status(400);
        }
        catch (err) {
            // trace error
            TraceUtils.error(err);
            // return generate login server error (500)
            return this.view(new LoginServerError(credentials && credentials.username)).status(500);
        }
    }
    
    @httpAction("logout")
    @httpGet()
    @httpPost()
    async getLogout(): Promise<HttpResult> {
        // set auth cookie to nothing
        this.context.getApplication().getStrategy(AuthStrategy).setAuthCookie(this.context, 'anonymous', { expires: new Date(1970, 1, 1) });
        // cast request object
        let request = this.context.request as IncomingMessageQuery;
        // redirect to home or continue URI
        return this.redirect(request.query.continue || this.context.getApplication().resolveUrl('~/'));
    }
}

export default AuthController;

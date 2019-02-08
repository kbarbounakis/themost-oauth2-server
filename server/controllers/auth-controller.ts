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
import {EncryptionStrategy} from '@themost/web/handlers/auth';
import {TraceUtils} from '@themost/common/utils';
import * as moment from 'moment';
import * as _ from 'lodash';
import {httpGet,httpPost,httpAction,httpParam,httpController} from '@themost/web/decorators';
import {LoginService} from '../services/login-service';
import {InvalidClientError, InvalidCredentialsError} from '../errors';

const AuthControllerMessages = {
    serverError: {
        "code": 500,
        "error": "server_error",
        "error_description": "Internal server error."
    },
    invalidRequest: {
        "code": 500,
        "error": "server_error",
        "error_description": "Method not allowed."
    },
    invalidToken: {
        "code": 400,
        "error": "invalid_token",
        "error_description": "Token is invalid."
    },
    tokenNotFound: {
        "code": 404,
        "error": "invalid_request",
        "error_description": "The specified token was not found."
    },
    profileNotFound: {
        "code": 400,
        "error": "invalid_request",
        "error_description": "User profile was not found."
    },
    tokenExpired: {
        "code": 400,
        "error": "invalid_request",
        "error_description": "Token was expired."
    },
    invalidData: {
        "code": 400,
        "error": "invalid_client",
        "error_description": "Invalid client data."
    },
    invalidGrant: {
        "code": 400,
        "error": "invalid_grant",
        "error_description": "Invalid grant type."
    },
    invalidScope: {
        "code": 400,
        "error": "invalid_scope",
        "error_description": "Invalid scope."
    },
    invalidCredentials: {
        "code": 401,
        "error": "invalid_credentials",
        "error_description": "Unknown username or bad password."
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
    
    /**
     * @returns {Promise|*}
     */
    @httpAction("me")
    @httpGet()
    @httpParam({ name:"access_token", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:255 })
    async getMe(access_token: string): Promise<HttpResult> {
        try {
            //if access token is missing search for Authorization:Bearer [Access Token] header
            if (_.isNil(access_token)) {
                const authorizationHeader = this.context.request.headers['authorization'];
                if (_.isString(authorizationHeader)) {
                    if (/^Bearer\s+/.test(authorizationHeader)) {
                        access_token = authorizationHeader.replace(/^Bearer\s+/,'');
                    }
                }
            }
            // get access token
            let token = await this.context.model('AccessToken').where('access_token').equal(access_token).silent().getItem();
            if (typeof token === 'undefined') {
                return this.json(AuthControllerMessages.tokenNotFound).status(AuthControllerMessages.tokenNotFound.code);
            }
            if (token.expires) {
                return this.json(AuthControllerMessages.tokenExpired).status(400);
            }
            // get user
            let user = await this.context.model('User').where('name').equal(token.user_id).silent().getItem();
            if (typeof user === 'undefined') {
                return this.json(AuthControllerMessages.profileNotFound).status(400);
            }
            return this.json({ id:user.id, name:user.name });
        }
        catch (err) {
            TraceUtils.error(err);
            return this.json(AuthControllerMessages.serverError).status(500);
        }
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("tokeninfo")
    @httpPost()
    @httpParam({ name:"access_token", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:255 })
    async postTokenInfo(access_token: string): Promise<HttpResult> {
        try {
            // get access_token attribute
            let access_token_attr = this.context.model('AccessToken').field('access_token');
            // validate access_token attribute size
            if (access_token_attr.size && access_token.length>access_token_attr.size) {
                return this.json(AuthControllerMessages.tokenNotFound).status(AuthControllerMessages.tokenNotFound.code);
            }
            // get token
            let token = await this.context.model('AccessToken').where('access_token').equal(access_token).silent().cache(true).getItem();
            if (typeof token === 'undefined') {
                return this.json(AuthControllerMessages.tokenNotFound).status(AuthControllerMessages.tokenNotFound.code);
            }
            const now = new Date();
            const expires = moment(token.expires);
            // set new access token
            const result = {
                "active":expires.diff(now)>0,
                "scope":token.scope,
                "client_id":token.client_id,
                "username":token.user_id,
                "exp":expires.diff(moment('1970-01-01'),'seconds')
            };
            // return token
            return this.json(result);
        }
        catch (err) {
            TraceUtils.error(err);
            return this.json(AuthControllerMessages.serverError).status(AuthControllerMessages.serverError.code);
        }
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("access_token")
    @httpGet()
    @httpPost()
    @httpParam({ name:"client_id", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:48 })
    @httpParam({ name:"client_secret", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:48 })
    @httpParam({ name:"code", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:128 })
    async getAccessToken(client_id: string, client_secret: string, code: string): Promise<HttpResult> {
        try {
            // validate client
            let count = await this.context.model('AuthClient').where('client_id').equal(client_id)
                                        .and('client_secret').equal(client_secret)
                                        .silent()
                                        .count();
            if (count === 0) {
                return this.json(AuthControllerMessages.invalidData).status(AuthControllerMessages.invalidData.code);
            }
            // get access token
            let token = await this.context.model('AccessToken')
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
                        "access_token":token.access_token,
                        "expires": token.expires,
                        "refresh_token":token.refresh_token,
                        "token_type":"bearer",
                        "scope":token.scope
                    }).status(200);
        }
        catch (err) {
            TraceUtils.error(err);
            return this.json(AuthControllerMessages.serverError).status(AuthControllerMessages.serverError.code);
        }
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("authorize")
    @httpGet()
    @httpParam({ name:"client_id", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:48 })
    @httpParam({ name:"redirect_uri", type:"Text",maxLength:256 })
    @httpParam({ name:"response_type", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:48 })
    @httpParam({ name:"scope", type:"Text",pattern:/[a-zA-Z0-9\s.\-+_]+$/,maxLength:128 })
    async getAuthorize(client_id: string, redirect_uri: string, response_type?: string, scope?: string): Promise<HttpResult> {
        try {
            // get client
            let client = await this.context.model('AuthClient').where('client_id').equal(client_id).silent().expand('scopes').getTypedItem();
            if (typeof client === 'undefined') {
                return this.view(AuthControllerMessages.invalidData).setName("error").status(400);
            }
            if (!client.hasGrantType(response_type)) {
                return this.view(AuthControllerMessages.invalidGrant).setName("error").status(400);
            }
            if (redirect_uri && !client.hasRedirectUri(redirect_uri)) {
                return this.view(AuthControllerMessages.invalidData).setName("error").status(400);
            }
            // get redirect uri
            redirect_uri = redirect_uri || client.redirect_uri;
            // get already defined client scopes
            let clientScope;
            if (client.scopes && client.scopes.length) {
                // create a comma separated list of client scopes
                clientScope = client.scopes.map( x => x.name).join(',');
            }
            // get scope from request or scopes associated with this client or the default profile scope
            scope = scope || clientScope || 'profile';
            // validate scope
            let hasScope = await client.hasScope(scope);
            if (hasScope) {
                return this.redirect(this.context.getApplication().resolveUrl(`~/login?response_type=${response_type}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_id=${client_id}&scope=${scope}`));
            }
            // throw error of invalid scope
            return this.view(AuthControllerMessages.invalidScope).status(400);
        }
        catch (err) {
            TraceUtils.error(err);
            return this.view(AuthControllerMessages.serverError).status(500);
        }
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("authorize")
    @httpPost()
    @httpParam({ name:"grant_type", type:"Text",pattern:/^password|client_credentials$/ })
    @httpParam({ name:"client_id", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:48 })
    @httpParam({ name:"client_secret", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:48 })
    @httpParam({ name:"scope", type:"Text",pattern:/^[a-zA-Z.\s,]+$/,maxLength:256 })
    @httpParam({ name:"username", type:"Text",maxLength:128 })
    @httpParam({ name:"password", type:"Text",maxLength:128 })
    async postAuthorize(grant_type: string, client_id: string, client_secret: string, scope: string, username: string, password: string): Promise<HttpResult> {
        try {
                // validate scope
            if (typeof scope === 'undefined') {
                return this.json(AuthControllerMessages.invalidScope).status(400);
            }
            // get client
            let client = await this.context.model('AuthClient')
                                            .where("client_id").equal(client_id)
                                            .and('client_secret').equal(client_secret).silent().getTypedItem();
                    // 
            if (typeof client === 'undefined') {
                return this.json(AuthControllerMessages.invalidData).status(400);
            }
            if (!client.hasGrantType(grant_type)) {
                return this.json(AuthControllerMessages.invalidGrant).status(400);
            }
            
            let hasScope = await client.hasScope(scope);
            if (hasScope) {
                const loginService = new LoginService(this.context, client_id);
                // validate credentials
                try {
                    let token = await loginService.login(username,password);
                    //set response
                    return this.json({
                        "token_type":"Bearer",
                        "expires_in":token.expires.getTime(),
                        "access_token": token.access_token,
                        "refresh_token":token.refresh_token,
                        "scope":token.scope
                    });
                }
                catch(err) {
                    // handle error
                    if (err instanceof InvalidClientError) {
                        return this.json(AuthControllerMessages.invalidData).status(400);
                    }
                    else if (err instanceof InvalidCredentialsError) {
                        return this.json(AuthControllerMessages.invalidCredentials).status(AuthControllerMessages.invalidCredentials.code);
                    }
                    return this.json(AuthControllerMessages.serverError).status(AuthControllerMessages.serverError.code);
                }
            }
             return this.json(AuthControllerMessages.invalidScope).status(400);
        }
        catch (err) {
            TraceUtils.error(err);
            return this.json(AuthControllerMessages.serverError).status(AuthControllerMessages.serverError.code);
        }
        
    }

}

export default AuthController;
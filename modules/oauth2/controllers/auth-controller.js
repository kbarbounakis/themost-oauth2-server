/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import HttpBaseController from '@themost/web/controllers/base';
import {EncryptionStrategy} from '@themost/web/handlers/auth';
import {TraceUtils} from '@themost/common/utils';
import {HttpServerError} from '@themost/common/errors';
import moment from 'moment';
import _ from 'lodash';
import {httpGet,httpPost,httpAction,httpParam,httpController} from '@themost/web/decorators';
import {LoginService, InvalidClientError, InvalidCredentialsError} from '../services/login-service';


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
    getMe(access_token) {
        const self = this;
        return new Promise((resolve) => {

            //if access token is missing search for Authorization:Bearer [Access Token] header
            if (_.isNil(access_token)) {
                const authorizationHeader = self.context.request.headers['authorization'];
                if (_.isString(authorizationHeader)) {
                    if (/^Bearer\s+/.test(authorizationHeader)) {
                        access_token = authorizationHeader.replace(/^Bearer\s+/,'');
                    }
                }
            }
            return self.context.model('AccessToken')
                .where('access_token').equal(access_token).silent()
                .getItem().then(function(result) {
                    if (_.isNil(result)) {
                        return resolve(self.json(AuthControllerMessages.tokenNotFound).statusCode(AuthControllerMessages.tokenNotFound.code));
                    }
                    if (result.expires) {
                        if (result.expires<(new Date())) {
                            return resolve(self.json(AuthControllerMessages.tokenExpired).statusCode(400));
                        }
                    }
                    return self.context.model('User').where('name').equal(result.user_id).silent().getItem().then(function (user) {
                        if (_.isNil(user)) {
                            return resolve(self.json(AuthControllerMessages.profileNotFound).statusCode(400));
                        }
                        return resolve(self.json({ id:user.id, name:user.name }));
                    });
                }).catch(function (err) {
                    TraceUtils.error(err);
                    return resolve(self.json(AuthControllerMessages.serverError).statusCode(500));
                });

        });
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("tokeninfo")
    @httpPost()
    @httpParam({ name:"access_token", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:255 })
    postTokenInfo(access_token) {
        const self = this;
        let accessTokens = self.context.model('AccessToken');
        let access_token_attr = accessTokens.field('access_token');
        return new Promise((resolve)=> {
            if (access_token_attr.size && access_token.length>access_token_attr.size) {
                return resolve(self.json(AuthControllerMessages.tokenNotFound).statusCode(AuthControllerMessages.tokenNotFound.code));
            }
            return accessTokens
                .where('access_token').equal(access_token)
                .silent()
                .cache(true)
                .getItem()
                .then(function(token) {
                    //if token was not found
                    if (_.isNil(token)) {
                        return resolve(self.json(AuthControllerMessages.tokenNotFound).statusCode(AuthControllerMessages.tokenNotFound.code));
                    }
                    const now = new Date();
                    const expires = moment(token.expires);
                    const result = {
                        "active":expires.diff(now)>0,
                        "scope":token.scope,
                        "client_id":token.client_id,
                        "username":token.user_id,
                        "exp":expires.diff(moment('1970-01-01'),'seconds')
                    };
                    return resolve(self.json(result));
                }).catch((err)=> {
                    TraceUtils.error(err);
                    return resolve(self.json(AuthControllerMessages.serverError).statusCode(AuthControllerMessages.serverError.code));
                });
        });


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
    getAccessToken(client_id, client_secret, code) {
        const self = this;
        return new Promise((resolve) => {
            self.context.model('AuthClient').where('client_id').equal(client_id)
                .and('client_secret').equal(client_secret)
                .silent()
                .count().then(function(count) {
                if (count === 0) {
                    return resolve(self.json(AuthControllerMessages.invalidData).statusCode(AuthControllerMessages.invalidData.code));
                }
                return self.context.model('AccessToken')
                    .where('access_token').equal(self.context.getApplication().getStrategy(EncryptionStrategy).decrypt(code))
                    .silent()
                    .getItem()
                    .then(function(token) {
                        if (_.isNil(token)) {
                            return resolve(self.json(AuthControllerMessages.tokenNotFound).statusCode(AuthControllerMessages.tokenNotFound.code));
                        }
                        return resolve(self.json({
                            "access_token":token.access_token,
                            "expires": token.expires,
                            "refresh_token":token.refresh_token,
                            "token_type":"bearer",
                            "scope":token.scope
                        }).statusCode(200));
                    }).catch(function(err) {
                        TraceUtils.error(err);
                        return resolve(self.json(AuthControllerMessages.serverError).statusCode(AuthControllerMessages.serverError.code));
                    });

            });
        });
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
    getAuthorize(client_id, redirect_uri, response_type, scope) {
        const self = this;
        return new Promise((resolve) => {
            //get request params
            response_type = response_type || 'code' ;
            return self.context.model('AuthClient').where('client_id').equal(client_id)
                .silent()
                .expand('scopes')
                .getTypedItem()
                .then(function(result) {
                    if (_.isNil(result)) {
                        return resolve(self.view(AuthControllerMessages.invalidData).setName("error").status(400));
                    }
                    if (!result.hasGrantType(response_type)) {
                        return resolve(self.view(AuthControllerMessages.invalidGrant).setName("error").status(400));
                    }
                    if (redirect_uri && !result.hasRedirectUri(redirect_uri)) {
                        return resolve(self.view(AuthControllerMessages.invalidData).setName("error").status(400));
                    }
                    // get redirect uri
                    redirect_uri = redirect_uri || result.redirect_uri;
                    // get already defined client scopes
                    let clientScope;
                    if (result.scopes && result.scopes.length) {
                        // create a comma separated list of client scopes
                        clientScope = result.scopes.map( x => x.name).join(',');
                    }
                    // get scope from request or scopes associated with this client or the default profile scope
                    scope = scope || clientScope || 'profile';
                    // validate scope
                    return result.hasScope(scope).then((hasScope) => {
                        if (hasScope) {
                            return resolve(self.redirect(self.context.getApplication().resolveUrl(`~/login?response_type=${response_type}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_id=${client_id}&scope=${scope}`)));
                        }
                        // throw error of invalid scope
                        return resolve(self.json(AuthControllerMessages.invalidScope).status(400));
                    });
            }).catch(function (err) {
                TraceUtils.error(err);
                return resolve(new HttpServerError());
            });
        });
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
    postAuthorize(grant_type, client_id, client_secret, scope, username, password) {
        const self = this;
        return new Promise((resolve, reject) => {
            //get request params
            self.context.model('AuthClient')
                .where("client_id").equal(client_id)
                .and('client_secret').equal(client_secret).silent().getTypedItem().then((client) => {
                    if (_.isNil(client)) {
                        return resolve(self.json(AuthControllerMessages.invalidData).status(400));
                    }
                    if (!client.hasGrantType(grant_type)) {
                        return resolve(self.json(AuthControllerMessages.invalidGrant).status(400));
                    }
                    if (_.isNil(scope)) {
                        return resolve(self.json(AuthControllerMessages.invalidScope).status(400));
                    }
                    return client.hasScope(scope).then((hasScope)=> {
                        if (hasScope) {
                            const loginService = new LoginService(self.context, client_id);
                            return loginService.login(username,password, (err, token)=> {
                                if (err) {
                                    if (err instanceof InvalidClientError) {
                                        return resolve(self.json(AuthControllerMessages.invalidData).status(400));
                                    }
                                    else if (err instanceof InvalidCredentialsError) {
                                        return resolve(self.json(AuthControllerMessages.invalidCredentials).status(AuthControllerMessages.invalidCredentials.code));
                                    }
                                    return resolve(self.json(AuthControllerMessages.serverError).status(AuthControllerMessages.serverError.code));
                                }
                                //set response
                                return resolve(self.json({
                                    "token_type":"Bearer",
                                    "expires_in":token.expires.getTime(),
                                    "access_token": token.access_token,
                                    "refresh_token":token.refresh_token,
                                    "scope":token.scope
                                }));
                            });
                        }
                        // throw error of invalid scope
                        return resolve(self.json(AuthControllerMessages.invalidScope).status(400));
                    })
            }).catch((err)=> {
                return reject(err);
            });

        });
    }

}

module.exports = AuthController;
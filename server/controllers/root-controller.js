/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import HttpBaseController from '@themost/web/controllers/base';
import {AuthStrategy,EncryptionStrategy} from '@themost/web/handlers/auth';
import {TraceUtils } from "@themost/common/utils";
import _ from 'lodash';
import {httpGet,httpAction,httpController,httpParam,httpPost} from '@themost/web/decorators';
import {LoginService, InvalidClientError, InvalidCredentialsError} from '../services/login-service';
import moment from 'moment';

/**
 * @augments {HttpController}
 */
@httpController()
export default class RootController extends HttpBaseController {

    /**
     * @constructor
     */
    constructor(context) {
        super(context);
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("welcome")
    @httpGet()
    @httpPost()
    getWelcome() {
        return this.view().setName(`welcome.${this.context.culture()}`);
    }
    /**
     * @returns {Promise|*}
     */
    @httpAction("logout")
    @httpGet()
    @httpPost()
    getLogout() {
            return new Promise((resolve)=> {
            this.context.getApplication().getStrategy(AuthStrategy).setAuthCookie(this.context, 'anonymous', { expires: new Date(1970, 1, 1) });
            return resolve(this.redirect(this.context.params['continue'] || this.context.getApplication().resolveUrl('~/')));
        });
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("index")
    @httpGet()
    getIndex() {
        if (this.context.params.lang) {
            //change language
            let cultures = this.context.getApplication().getConfiguration().getSourceAt('settings/localization/cultures');
            if (Array.isArray(cultures)) {
                let culture = cultures.find(x =>{
                   return x.substr(0,2) === this.context.params.lang;
                });
                if (culture) {
                    this.context.setCookie('.LANG', culture, moment().add(1,'year').toDate());
                    /**
                     * @type {string | string[] | undefined}
                     */
                    let referer = this.context.request.headers['referer'];
                    if (typeof referer === 'string') {
                        return this.redirect(referer);
                    }
                    return this.redirect(this.context.getApplication().resolveUrl('~/'));
                }
            }
        }
        return this.view();
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("login")
    @httpParam({ name:"client_id", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:48 })
    @httpParam({ name:"redirect_uri", type:"Text",maxLength:256 })
    @httpParam({ name:"response_type", type:"Text",pattern:/^(code|token)$/,maxLength:48 })
    @httpParam({ name:"scope", type:"Text",pattern:/[a-zA-Z0-9\s.\-+_]+$/,maxLength:128 })
    @httpGet()
    getLogin(client_id, response_type, redirect_uri, scope) {
        const self = this;
        const authorization_id = self.context.getApplication().getConfiguration().settings.auth['client_id'];
        return new Promise((resolve, reject)=> {
            //get query string parameters
            let userData;
            try {
                userData = JSON.parse(self.context.getApplication().getStrategy(AuthStrategy).getAuthCookie(self.context));
            }
            catch (e) {
                //do nothing
            }
            if (userData) {
                self.context.model('AuthClient').silent().where('client_id').equal(client_id).getTypedItem().then((client)=> {
                    if (client) {
                        self.context.model('User').silent().where('name').equal(userData.user).select('id','name').getItem().then((user)=> {
                            if (user) {
                                const accessTokens = self.context.model('AccessToken');
                                accessTokens.silent()
                                    .where('client_id').equal(client_id)
                                    .and('user_id').equal(user.name)
                                    .and('expires').greaterThan(new Date())
                                    .getItem().then(function(existedToken) {
                                    if (_.isObject(existedToken)) {
                                        //redirect back to client
                                        if (client_id === authorization_id) {
                                            return resolve(self.redirect(self.context.getApplication().resolveUrl('~/user')));
                                        }
                                        if (redirect_uri && !client.hasRedirectUri(redirect_uri)) {
                                            TraceUtils.error(`Invalid redirect uri for client ${client.client_id}, redirect_uri=${redirect_uri}`);
                                            return resolve(self.view({code:'EREQ', message:'GeneralErrorMessage'}).status(400));
                                        }
                                        if (response_type === 'token') {
                                            if (!client.hasGrantType(response_type)) {
                                                return resolve(self.view({code:'EGRANT', message:'Your request contains invalid or outdated data. Please try again or contact to system administrator.'}).status(401));
                                            }
                                            return resolve(self.redirect(`${(redirect_uri || client.redirect_uri)}?response_type=token&access_token=${existedToken.access_token}&token_type=bearer`));
                                        }
                                        return resolve(self.redirect((redirect_uri || client.redirect_uri) + '?response_type=code&code=' + self.context.getApplication().getStrategy(EncryptionStrategy).encrypt(existedToken.access_token)));
                                    }
                                    return resolve(self.view());

                                }).catch(function (err) {
                                    TraceUtils.error(err);
                                    return resolve(self.view({code:"EREQ", message:'Login failed due to identity server error. Please try again or contact to system administrator.'}).status(500));
                                });
                            }
                            else {
                                return resolve(self.view({code:"ECREDS", message:"An error occurred while validating your credentails. Please try again or contact to system administrator."}).status(401));
                            }
                        }).catch((err)=> {
                            TraceUtils.error(err);
                            return resolve(self.view({code:"EREQ", message:"An error occurred while validating your credentails. Please try again or contact to system administrator."}).status(500));
                        });
                    }
                    else {
                        //do nothing
                        return resolve(self.view());
                    }
                }).catch((err)=> {
                    TraceUtils.error(err);
                    return resolve(self.view({code:"EREQ", message:'An internal server error occurred. Please try again or contact to system administrator.'}).status(401));
                });
            }
            else {
                return resolve(self.view());
            }

        });
    }

    @httpAction("login")
    @httpPost()
    @httpParam({ name:"client_id", type:"Text",pattern:/^[a-zA-Z0-9]+$/,maxLength:48 })
    @httpParam({ name:"redirect_uri", type:"Text",maxLength:256 })
    @httpParam({ name:"response_type", type:"Text",pattern:/^(code|token)$/,maxLength:48 })
    @httpParam({ name:"scope", type:"Text",pattern:/[a-zA-Z0-9\s.\-+_]+$/,maxLength:128 })
    postLogin(client_id, redirect_uri, response_type, credentials, scope) {
        const self = this;
        const authorization_id = self.context.getApplication().getConfiguration().settings.auth['client_id'];
        const client_id_ = client_id || authorization_id;
        return new Promise((resolve)=> {
            try {
                //validate anti-forgery token
                self.context.validateAntiForgeryToken();
                //1. Validate Client ID
                if (!/^\d+$/.test(client_id_)) {
                    return resolve(self.view({username:credentials.username, code:'EREQ', message:'Your request contains invalid parameters. Please try again or contact to system administrator.'}).status(405));
                }
                //2. Get Client Data
                self.context.model('AuthClient').silent().where('client_id').equal(client_id_).getTypedItem().then(function (client) {
                    if (_.isNil(client)) {
                        return resolve(self.view({code:'EREQ', message:'Your request contains invalid or outdated data. Please try again or contact to system administrator.'}).status(401));
                    }
                    if (response_type && !client.hasGrantType(response_type)) {
                        return resolve(self.view({ code:'EREQ', message:'Your request contains invalid application data. Please try again or contact to system administrator.'}).status(400));
                    }
                    // validate redirect_uri
                    if (redirect_uri && !client.hasRedirectUri(redirect_uri)) {
                        TraceUtils.error(`Invalid redirect uri for client ${client.client_id}, redirect_uri=${redirect_uri}`);
                        return resolve(self.view({ code:'EREQ', message:'GeneralErrorMessage'}).status(400));
                    }
                    const loginService = new LoginService(self.context, client_id_,scope);
                    loginService.login(credentials.username,credentials.password, (err, token)=> {
                        if (err) {
                            if (err instanceof InvalidCredentialsError) {
                                return resolve(self.view({username:credentials.username, code:'ECREDS', message:'Unknown username or bad password. Please try again.'}).status(401));
                            }
                            TraceUtils.error(err);
                            return resolve(self.view({username:credentials.username, code:'ESERVER', message:'An internal server error occurred. Please try again or contact to system administrator.'}).status(500));
                        }
                        if (_.isNil(client_id)) {
                            return resolve(self.redirect(self.context.getApplication().resolveUrl('~/user')));
                        }
                        else {
                            if (response_type === 'token') {
                                return resolve(self.redirect(`${(redirect_uri || client.redirect_uri)}?response_type=token&access_token=${token.access_token}&token_type=bearer`));
                            }
                            return resolve(self.redirect((redirect_uri || client.redirect_uri) + '?response_type=code&code=' + self.context.getApplication().getStrategy(EncryptionStrategy).encrypt(token.access_token)));
                        }
                    });
                }).catch(function(err) {
                    TraceUtils.error(err);
                    return resolve(self.view({username:credentials.username, code:'ESERVER', message:'An internal server error occurred. Please try again or contact to system administrator.'}));
                });
            }
            catch (err) {
                TraceUtils.error(err);
                return resolve(self.view({username:credentials.username, code:'ESERVER', message:'An internal server error occurred. Please try again or contact to system administrator.'}));
            }
        });
    }


}
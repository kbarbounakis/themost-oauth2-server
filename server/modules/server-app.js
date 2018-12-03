/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {EncryptionStrategy} from "@themost/web/handlers/auth";
/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com
 *                     Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
export function bootstrap(angular) {


    let serverExtensions = angular.module('server-extensions',[]);
    serverExtensions
        .directive('serverStripAccents', function() {
            return {
                restrict: 'A',
                link: function (scope, element) {
                    let text = element.html();
                    if (text) {
                        element.html(text.replace(/[ά]/ig, 'α')
                            .replace(/[έ]/ig, 'ε')
                            .replace(/[ή]/ig, 'η')
                            .replace(/[ίΐϊ]/ig, 'ι')
                            .replace(/[ό]/ig, 'ο')
                            .replace(/[ύΰϋ]/ig, 'υ')
                            .replace(/[ώ]/ig, 'ω'));
                    }
                }
            };
        })
        .directive('serverTranslate', function($context) {
        return {
            restrict: 'A',
            link: function (scope, element) {
                element.html($context.translate(element.html()));
                let attrPlaceholder = element.attr('placeholder');
                if (attrPlaceholder) {
                    element.attr('placeholder', $context.translate(attrPlaceholder));
                }
                let attrTitle = element.attr('title');
                if (attrTitle) {
                    element.attr('title', $context.translate(attrTitle));
                }
            }
        };
    }).directive('serverAntiForgery', function($context) {
        return {
            restrict: 'A',
            link:{
                pre:  function (scope, element) {
                    const tokenName = '_CSRFToken';
                    let encryptionStrategy = $context.getApplication().getStrategy(EncryptionStrategy);
                    let tokenValue = encryptionStrategy.encrypt(JSON.stringify({ id: Math.floor(Math.random() * 1000000), url:$context.request.url, date:new Date() }));
                    $context.response.setHeader('Set-Cookie',`.CSRF=${tokenValue}; Path=/`);
                    element.attr('name',tokenName);
                    element.val(tokenValue);
                },
                post: function (scope, element) {
                    element.removeAttr('server-anti-forgery');
                }
            }
        };
    });
    return angular.module('server',['server-extensions']);
}

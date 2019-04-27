/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {URL} from 'url';
import {HttpContext} from '@themost/web';

declare interface HttpContextExtensions extends HttpContext {
    getServerOrigin(): string;
    resolveAbsoluteUrl(relative: string): string;
}

Object.defineProperty(HttpContext.prototype, 'getServerOrigin', {
   get: () => {
       return function getServerOrigin(this: HttpContextExtensions) {
            const origin = this.getApplication().getConfiguration().getSourceAt('settings/app/origin') || process.env.ORIGIN;
            if (typeof origin !== 'undefined' && origin !== null) {
                return origin;
            } else if (typeof this.request.headers['x-forwarded-host'] === 'string') {
                return (this.request.headers['x-forwarded-proto'] || 'http')
                    + '://' + this.request.headers['x-forwarded-host'];
            } else {
                return (this.request.headers.protocol || 'http') + '://' + this.request.headers.host;
            }
        };
   }
});

Object.defineProperty(HttpContext.prototype, 'resolveAbsoluteUrl', {
   get: () => {
       return function resolveAbsoluteUrl(this: HttpContextExtensions, relative: string) {
            return new URL(this.getServerOrigin(), this.getApplication().resolveUrl(relative)).toString();
        };
   }
});


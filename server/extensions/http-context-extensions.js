/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {HttpContext} from '@themost/web/context';
import _ from 'lodash';
import url from 'url';

_.assign(HttpContext.prototype, {
    /**
     * @this {HttpContext}
     */
    getServerOrigin() {
        let origin = this.getApplication().getConfiguration().getSourceAt('settings/app/origin') || process.env.ORIGIN;
        if (typeof origin !== 'undefined' && origin !== null) {
            return origin;
        }
        else if (typeof this.request.headers['x-forwarded-host'] === 'string') {
            return (this.request.headers['x-forwarded-proto'] || 'http') + '://' + this.request.headers['x-forwarded-host'];
        }
        else {
            return (this.request.protocol || 'http') + '://' + this.request.headers.host;
        }
    },

    /**
     * @this {HttpContext}
     */
    resolveAbsoluteUrl(relative) {
        return url.resolve(this.getServerOrigin(), this.getApplication().resolveUrl(relative));
    }

});

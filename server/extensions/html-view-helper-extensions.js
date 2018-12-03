import {HtmlViewHelper} from '@themost/web/helpers';
import {HtmlWriter} from '@themost/common/html';
import {EncryptionStrategy} from '@themost/web/handlers/auth';
import 'source-map-support/register';
import {_} from 'lodash';
import {JSFuck} from 'jsfuck';
const antiforgeryTokenProperty = Symbol('antiforgeryToken');

_.assign(HtmlViewHelper.prototype, {
    /**
     * @this {HtmlViewHelper}
     */
    getAntiforgeryToken() {
        if (this[antiforgeryTokenProperty]) {
            return this[antiforgeryTokenProperty];
        }
        /**
         * @type {EncryptionStrategy}
         */
        const encryptionStrategy = this.context.getApplication().getStrategy(EncryptionStrategy);
        let tokenValue = encryptionStrategy.encrypt(JSON.stringify({ id: Math.floor(Math.random() * 1000000), url:this.context.request.url, date:new Date() }));
        this[antiforgeryTokenProperty] = {
            "name": "_CSRFToken",
            "value": tokenValue
        };
        return this[antiforgeryTokenProperty];
    },
    /**
     * @this {HtmlViewHelper}
     * @param {string} forForm
     * @returns {String}
     */
    antiforgery(forForm) {
        let antiforgeyToken = this.getAntiforgeryToken();
        this.context.response.setHeader('Set-Cookie',`.CSRF=${antiforgeyToken.value}; Path=${this.context.getApplication().resolveUrl('~/')}`);
        let form = forForm || 'form';
        const plainScript = `$(document).ready(function () { $('${form}').submit(function (ev) { var $input = $('<input />').attr('type', 'hidden').attr('name', '${antiforgeyToken.name}').attr('value', '${antiforgeyToken.value}'); $('${form}').append($input); return true; }); });`;
        const encodedScript = JSFuck.encode(plainScript);
        let writer = new HtmlWriter();
        return writer.writeAttribute('type','text/javascript')
            .writeBeginTag('script')
            .writeText(`eval(${encodedScript})`)
            .writeEndTag()
            .toString();
    },
    /**
     * @param {string} appRelativeUrl - A string which represents an application relative URL like ~/login
     */
    resolveUrl(appRelativeUrl) {
        return this.context.getApplication().resolveUrl(appRelativeUrl);
    }
});
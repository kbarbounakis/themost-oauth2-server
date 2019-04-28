import {HttpApplication} from '@themost/web/app';
import path from 'path';
import {LocalizationStrategy, I18nLocalizationStrategy} from '@themost/web/localization';
import {OAuth2Service} from '../../../modules/oauth2/service';
// initialize app
const app = new HttpApplication(path.resolve(__dirname));
// set static content
app.useStaticContent(path.resolve(__dirname,'../app'));
app.useService(OAuth2Service);
// use i18n localization strategy as default localozation strategy
app.useStrategy(LocalizationStrategy, I18nLocalizationStrategy);
// export app
module.exports = app;

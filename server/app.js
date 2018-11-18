import createError from 'http-errors';
import express from 'express';
import engine from 'ejs-locals';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import sassMiddleware from 'node-sass-middleware';
import {ExpressDataApplication, dateReviver} from '@themost/express';
import indexRouter from './routes/index';
import i18n from 'i18n';
import cors from 'cors';

// init express app
let app = express();

// data context setup
let dataApp = new ExpressDataApplication(path.resolve(__dirname, 'config'));

// configure i18n
// https://github.com/mashpie/i18n-node#configure
// get locale configuration
let i18nConfiguration = dataApp.getConfiguration().getSourceAt('settings/i18n') || {
    locales: ['en'],
    defaultLocale: 'en'
};

// finally configure i18n
i18n.configure({
    locales: i18nConfiguration.locales,
    defaultLocale: i18nConfiguration.defaultLocale,
    directory: path.resolve(process.cwd(), 'locales')
});

// enable CORS
// https://github.com/expressjs/cors#configuring-cors
app.use(cors({ origin:true, credentials: true }));

// use ejs-locals for all ejs templates
app.engine('ejs', engine);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));

app.use(express.json({
  reviver: dateReviver 
}));

// parse urlencoded payloads
// https://expressjs.com/en/api.html#express.urlencoded
app.use(express.urlencoded({extended: false}));

// use cookie parser
// https://github.com/expressjs/cookie-parser
app.use(cookieParser());

// init i18n for request
app.use(i18n.init);

// use data middleware (register req.context)
app.use(dataApp.middleware());

// bind express data context localization methods to req
app.use((req, res, next) => {
    /**
     * Implements i18n.__ method to ExpressDataContext
     * @returns {string}
     */
    req.context.__  = function() {
        return i18n.__.apply(req, arguments);
    };
    /**
     * Implements i18n.__n method to ExpressDataContext
     * @returns {string}
     */
    req.context.__n  = function() {
        return i18n.__n.apply(req, arguments);
    };
    // continue
    next();
});

app.use(sassMiddleware({
  src: path.join(process.cwd(), 'public'),
  dest: path.join(process.cwd(), 'public'),
  indentedSyntax: false, // true = .sass and false = .scss
  sourceMap: true
}));

// use static files
app.use(express.static(path.join(process.cwd(), 'public')));

// use index router
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || err.statusCode || 500);
  res.render('error');
});

module.exports = app;

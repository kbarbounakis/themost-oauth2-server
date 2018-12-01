import express from 'express';
import passport from 'passport';
import LocalStrategy from 'passport-local';
let User = require('../models/user-model');
// use passport local strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'passwd',
    passReqToCallback: true,
    session: false
  },
  (req, username, password, done) => {
    User.validate(req.context, username, password).then(user => {
        if (user) {
            return done(null, user);
        }
        return done(null, false);
    }).catch(err => done(err));
  }
));

let router = express.Router();

/* GET home page. */
router.get('/',passport.authenticate('local', { failureRedirect: '/login' }), (req, res, next) => {
  res.render('index');
});

/* GET login page. */
router.get('/login', (req, res, next) => {
  res.render('login', { title: 'Express' });
});

/* GET login page. */
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) { 
      return next(err); 
    }
    if (!user) { 
      return res.render('login', { username: req.body.username }); 
    }
    return res.redirect('index');
    
  })(req, res, next);
});

module.exports = router;

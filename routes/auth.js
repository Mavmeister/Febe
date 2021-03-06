var Promise = require('bluebird');
var express = require('express');
var router = express.Router();
var models = require('../db');
var passport = require('../middleware/auth');

var bcrypt = require('bcrypt');
var hash = Promise.promisify(bcrypt.hash, bcrypt);

router.get('/logout', function(req, res) {
  req.logout();
  req.session.destroy();
  res.send();
});

var set_options = function(req, res, next) {
  if (req.body.user_kind || 'rep' in req.query) {
    req.session.user_kind = (req.body.user_kind === 'rep' || 'rep' in req.query) ? 'rep' : 'dev';
  }
  if (req.body.signup || 'signup' in req.query) {
    req.session.signup = true;
  }
  req.session.save();
  next();
};

var clear_options = function(req) {
  req.session.user_kind = undefined;
  req.session.signup = undefined;
  req.session.save();
};

var set_provider = function(provider) {
  return function(req, res, next) {
    res.locals.provider = provider;
    next();
  };
};

var handle_login = function(req, res, next) {
  passport.authenticate(res.locals.provider, function(err, user, info) {
    if (err === null && user !== false) {
      req.login(user, function() {
        clear_options(req);
        next();
      });
    } else if (info === 'NoModalSignup') {
      res.status(400).send('<script>window.localStorage.setItem("oauth_status", "denied")</script>');
    } else if (info === 'LoginToAddOAuth') {
      res.status(409).send('<script>window.localStorage.setItem("oauth_status", "conflict")</script>');
    } else {
      res.status(403).send('<script>window.localStorage.setItem("oauth_status", "rejected")</script>');
    }
  })(req, res, next);
};

var signal_complete = function(req, res) {
  if (!req.isAuthenticated) return res.status(403).send();
  res.json(req.user);
};

var oauth_signal_complete = function(req, res) {
  var signal = [
    '<script>',
    'window.localStorage.setItem("userId", ' + req.user.id + ');',
    'window.localStorage.setItem("oauth_status", "success");',
    '</script>'
  ].join('');
  res.set('Content-Type', 'text/html');
  res.send(signal);
};

var create_local_user = function(req, res, next) {
  var email = req.body.email;
  var password = req.body.password;
  var first_name = req.body.first_name;
  var last_name = req.body.last_name;
  var can_message = (!!req.body.can_message);

  if (!email || !password || !first_name) return res.status(400).send();

  models.User.check_if_exists(email).then(function(exists) {
    if (exists) return res.status(409).send();

    var user = {
      'kind': req.session.user_kind || 'dev',
      'first_name': first_name,
      'last_name': last_name,
      'email': email,
      'can_message': can_message
    };

    hash(password, 10).then(function(encrypted) {
      user.password = encrypted;
      return models.User.save(user);
    }).then(function(user) {
      req.login(user, function() {
        clear_options(req);
        next();
      });
    }, function(err) {
      return res.status(403).send();
    });
  });
};

router.post('/login', set_options, passport.authenticate('local'), signal_complete);
router.post('/signup', set_options, create_local_user, signal_complete);

router.get('/facebook/login', set_options, passport.authenticate('facebook', {'scope': ['email'], 'display': 'popup'}));
router.get('/facebook/callback', set_options, set_provider('facebook'), handle_login, oauth_signal_complete);

router.get('/github/login', set_options, passport.authenticate('github', {'scope': ['user:email']}));
router.get('/github/callback', set_options, set_provider('github'), handle_login, oauth_signal_complete);

router.get('/linkedin/login', set_options, passport.authenticate('linkedin', {'scope': ['r_emailaddress', 'r_basicprofile']}));
router.get('/linkedin/callback', set_options, set_provider('linkedin'), handle_login, oauth_signal_complete);

module.exports = {
  'router': router
};

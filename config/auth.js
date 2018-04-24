var passport = require('passport');

module.exports = {
    passport,
    login: function(req, res, next) {
        var auth = passport.authenticate('local', function(err, user) {
            if (err) return next(err);
            if (!user) {
              req.session.error = 'Invalid Username or Password!';
              res.redirect('/login');
            }
            req.logIn(user, function(err) {
              if (err) return next(err);
              req.session.save(function () {
                res.redirect('/control');
              });
            })
        });
        auth(req, res, next);
    },
    signup: function(req, res, next) {
      var auth = passport.authenticate('local-signup', function(err, user) {
          if (err) return next(err);
          if (!user) {
            req.session.error = 'Invalid Username or Password!';
            res.redirect('/signup');
            return;
          }
          req.logout();
          req.logIn(user, function(err) {
            if (err) return next(err);
            req.session.save(function () {
              res.redirect('/control');
            });
          })
      });
      auth(req, res, next);
    },
    logout: function(req, res, next) {
        req.logout();
        res.redirect('/login');
    },
    isAuthenticated: function(req, res, next) {
      if (req.isAuthenticated()) {
        return next();
      }
      else {
        res.redirect('/login');
      }
    },
    isInRole: function(role) {
        return function(req, res, next) {
            if (req.isAuthenticated() && req.user.roles.indexOf(role) > -1) {
                return true;
            }
            else {
                return false;
            }
        }
    }
};

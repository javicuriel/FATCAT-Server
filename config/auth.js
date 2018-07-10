var createError = require('http-errors');
var passport = require('passport');

module.exports = {
    // Login function to authenticate user
    login: function(req, res, next) {
        var auth = passport.authenticate('local', function(err, user) {
            if (err) return next(err);
            if (!user) {
              req.session.error = 'Invalid Username or Password!';
              req.flash('loginMessage', 'Invalid username or password');
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
    // Signup function to add new user to DB
    signup: function(req, res, next) {
      var auth = passport.authenticate('local-signup', function(err, user) {
          if (err) return next(err);
          if (!user) {
            req.session.error = 'Invalid Username or Password!';
            req.flash('signupMessage', 'That username is already taken.');
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
    // Logout function
    logout: function(req, res, next) {
        req.logout();
        req.flash('loginMessage', '');
        res.redirect('/login');
    },
    // Checks if user is authenticated first via cookies then with http basic auth
    isAuthenticated: function(req, res, next) {
      if (req.isAuthenticated()) {
        return next();
      }
      else {
        // If trying to use the api
        if(req.method == 'GET'){
          res.redirect('/login');
        }
        else{
          passport.authenticate('basic', { session: false })(req, res, next);
        }

      }
    },
    // Checks if user is authenticated and admin
    isAdmin: function(req, res, next) {
          if (req.isAuthenticated() && req.user.admin) {
            return next();
          }
          else {
            return next(createError(401));
            // res.redirect('back');
          }
    }
};

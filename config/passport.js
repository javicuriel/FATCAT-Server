var passport = require('passport');
var LocalPassport = require('passport-local');
var User = require('./user');

module.exports = function() {
    passport.use('local',new LocalPassport(function(username, password, done) {
        User.findOne({ username: username }, function(err, user) {
            if (err) { return done(err); }
            if (user && user.authenticate(password)) {
              return done(null, user);
            }
            else {
              return done(null, false);
            }
        });
    }));

    passport.use('local-signup', new LocalPassport(
      {passReqToCallback : true},
      function(req, username, password, done) {
        User.createUser({ username: username , password: password, confirmPassword:req.body.confirmPassword, admin:req.body.admin}, function(err, user){
          if (err) { return done(err);}
          if (user && user.authenticate(password)) {
            return done(null, user);
          }
          else {
            return done(null, false);
          }
        });
      }));

    passport.serializeUser(function(user, done) {
      if (user) {
        return done(null, user.id);
        // return done(null, user.id);
      }
    });

    passport.deserializeUser(function(id, done) {
        User.findOne({_id: id}, function(err, user) {
            if (err) {
              console.log('Error loading user: ' + err);
              return;
            }
            if (user) {
              return done(null, user);
            }
            else {
              return done(null, false);
            }
        })
    });
};

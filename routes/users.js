var express = require('express');
var router = express.Router();

var auth = require('../config/auth');
var passport = require('passport');

router.get('/', function(req, res, next) {
  res.redirect('/login');
});

/* GET users listing. */
router.get('/login', function(req, res, next) {
  res.render('users/login', { title: 'Login' });
});

// router.post('/login',
//   passport.authenticate('local', { successRedirect: '/',
//                                    failureRedirect: '/login',
//                                    failureFlash: true })
// );

router.post('/login', auth.login);
router.get('/logout', auth.logout);

module.exports = router;


// module.exports = function(app) {
//     app.get('/register', controllers.users.getRegister);
//     app.post('/register', controllers.users.createUser);
//
//     app.post('/login', auth.login);
//     app.get('/logout', auth.logout);
//     app.get('/login', controllers.users.getLogin);
//
//     app.get('/', function (req, res) {
//         res.render('index', {currentUser: req.user});
//     });
//
//     app.get('*', function (req, res) {
//         res.render('index', {currentUser: req.user});
//     });
// };

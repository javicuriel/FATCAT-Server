var express = require('express');
var router = express.Router();

var auth = require('../config/auth');
// var passport = require('passport');

// var User = require('../config/user');

router.get('/', function(req, res, next) {
  res.redirect('/control');
});

/* GET users listing. */
router.get('/login', function(req, res, next) {
  if(req.isAuthenticated()){
    res.redirect('/control');
  }
  else{
    res.render('users/login', { title: 'Login' , currentUser: req.user});
  }
});

router.get('/signup', auth.isAuthenticated, function(req, res, next) {
  res.render('users/signup', { title: 'Signup' , currentUser: req.user});
});

router.post('/signup',auth.isAuthenticated ,auth.signup);


router.post('/login', auth.login);
router.get('/logout', auth.logout);



module.exports = router;

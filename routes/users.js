var express = require('express');
var router = express.Router();

var auth = require('../config/auth');

router.get('/', function(req, res, next) {
  res.redirect('/control');
});

/* GET users listing. */
router.get('/login', function(req, res, next) {
  if(req.isAuthenticated()){
    res.redirect('/control');
  }
  else{
    res.render('users/login', { title: 'Login' , message: req.flash('loginMessage') ,currentUser: req.user});
  }
});

router.get('/signup', auth.isAdmin, function(req, res, next) {
  res.render('users/signup', { title: 'Signup' , currentUser: req.user,  message: req.flash('signupMessage') });
});

router.post('/signup', auth.isAdmin ,auth.signup);

router.post('/login', auth.login);
router.get('/logout', auth.logout);



module.exports = router;

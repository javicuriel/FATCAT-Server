var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('historic/index', { title: 'Historic Dashboard', currentUser: req.user.id });
});

router.get('/data', function(req, res, next){
  // res.setHeader('Content-Type', 'application/json');
  res.sendFile('test_data.json', {root: './temp'});
});

module.exports = router;

var express = require('express');
var router = express.Router();
var cloud = require('../config/cloud');
var moment = require('moment');
var api = require('../utilities/api');
var analysis_db = require('../config/database').get('carbonmeasurementapp_analysis');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('historic/index', { title: 'Historic Dashboard', currentUser: {id: req.user.id, username: req.user.username} });
});

router.get('/fatcat', function(req, res, next){
  res.sendFile('test_data.json', {root: './temp'});
});

router.get('/data', function(req, res, next){
  data = {rows:[]};
  if(validate_date(req.query.from) && validate_date(req.query.to)){
    var query = {
      selector: {
        timestamp: {
          $gte: req.query.from,
          $lt: moment(req.query.to).endOf('day').utc().toString()
        }
      }
    };
    analysis_db.find(query, function(err, d){
      data.rows = d.docs;
      data.rows.forEach(function(datum){
        datum.timestamp = new Date(datum.timestamp).getTime()
      });
      data.rows.sort(function(a, b){return a.timestamp - b.timestamp});
      res.send(data);
    });
  }
  else{
    res.send(data);
  }
});



function validate_date(date){
  d = moment(date, moment.ISO_8601);
  if (!d.isValid()){
    return false;
  }
  else{
    return true;
  }
}

module.exports = router;

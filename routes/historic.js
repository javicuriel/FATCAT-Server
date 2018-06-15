var express = require('express');
var router = express.Router();
var cloud = require('../config/cloud');
var moment = require('moment');
var api = require('../utilities/api');
var database = require('../config/database');
var analysis_db = database.get('carbonmeasurementapp_analysis');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('historic/index', { title: 'Historic Dashboard', currentUser: {id: req.user.id, username: req.user.username} });
});

router.get('/show/:id', function(req, res, next) {
  res.render('historic/show', { title: 'Historic Dashboard', eventId:req.params.id  ,currentUser: {id: req.user.id, username: req.user.username} });
});


function calculate_analysis(data, callback){
  query = JSON.stringify(data);
  cf_api = JSON.parse(process.env['cloud_functions']);
  if(process.env['cloud_functions']){
    var options = {
      hostname: cf_api.host,
      port: 443,
      path: '/api/v1/namespaces/alejandro.keller%40fhnw.ch_production/actions/calculate_analysis?blocking=true',
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': query.length,
          'Authorization': 'Basic ' + new Buffer(cf_api.key).toString('base64')
        }
      };
      api.postBody(options, query, function(code, response){
        callback(response.response.result);
      });
  }
  else{
    callback("Not Authorization");
  }
}

router.get('/data/:id', function(req, res, next) {
  data = {rows:[]};
  var query = api.getQuery(null, null, null, null, req.params.id);
  analysis_db.find(query, function(err, d){
    if(err){
      res.send('Error');
      return;
    }
    if(d.docs.length == 0){
      res.send(data);
      return;
    }
    event = d.docs[0];
    t1 = moment(event.timestamp);
    t0 = moment(event.timestamp).subtract(5, 'seconds');
    t2 = moment(event.timestamp).add(630, 'seconds');
    databases = getDatabasebyDates(t0,t2);
    console.log(databases);
    total_rows = databases.length;
    sample_query = api.getQuery(t0.toISOString(), t2.toISOString(), event.deviceId, 'reading');
    databases.forEach(function(db_name){
      db = database.get(db_name);
      db.find(sample_query, function(err, s_data){
        if(err){
          res.send('Error');
        }
        else{
          s_data.docs.forEach(function(datum){
            data.rows.push(datum.data)
          });
        }
        --total_rows;
        if(total_rows <= 0){
          data.timestamp = event.timestamp;
          data.rows.sort(function(a, b){return a.timestamp - b.timestamp});
          calculate_analysis(data, function (results) {
            results.deviceId = event.deviceId;
            res.send(results);
          });
        }
      });
    });

  });
});

router.get('/fatcat', function(req, res, next){
  res.sendFile('test_data.json', {root: './temp'});
});

router.get('/data', function(req, res, next){
  data = {rows:[]};
  if(validate_date(req.query.from) && validate_date(req.query.to)){
    var query = api.getQuery(req.query.from, moment(req.query.to).endOf('day').toISOString());
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


function getDatabasebyDates(start, end) {
    var base = 'iotp_'+cloud.config.org+'_default_';
    var dateArray = [];
    var currentDate = moment(start);
    var endDate = moment(end);

    var min = moment('2018-06-01')

    while (currentDate <= endDate) {
      dateArray.push(base + moment(currentDate).format('YYYY-MM-DD'));
      currentDate = moment(currentDate).add(1, 'days');
    }

    return dateArray;
}



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

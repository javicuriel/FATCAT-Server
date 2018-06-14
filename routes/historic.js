var express = require('express');
var router = express.Router();
var cloud = require('../config/cloud');
var moment = require('moment');
var api = require('../utilities/api');
var database = require('../config/database');
var analysis_db = database.get('carbonmeasurementapp_analysis');
var PythonShell = require('python-shell');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('historic/index', { title: 'Historic Dashboard', currentUser: {id: req.user.id, username: req.user.username} });
});

router.get('/show/:id', function(req, res, next) {
  res.render('historic/show', { title: 'Historic Dashboard', eventId:req.params.id  ,currentUser: {id: req.user.id, username: req.user.username} });
});

function run_analysis(data, callback) {
  var pyshell = new PythonShell('/utilities/python/analisis.py', {mode: 'json'});
  var output = '';
  pyshell.stdout.on('data', function (d) {
      output += ''+d;
  });
  pyshell.send(data).end(function (err) {
    if(err){
      console.log(err);
    }
    else{
      callback(output)
    }
  });
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
    t1 = moment(d.docs[0].timestamp);
    t0 = moment(d.docs[0].timestamp).subtract(5, 'seconds');
    t2 = moment(d.docs[0].timestamp).add(630, 'seconds');
    var name = 'iotp_'+cloud.config.org+'_default_'+ t1.format('YYYY-MM-DD');
    sample_db = database.get(name);
    sample_query = api.getQuery(t0.toISOString(), t2.toISOString(), d.docs[0].deviceId, 'reading');
    sample_db.find(sample_query, function(err, s_data){
      if(err){
        res.send('Error');
        return;
      }
      s_data.docs.forEach(function(datum){
        data.rows.push(datum.data)
      });
      data.timestamps = {t0:t0.toISOString(), t1:t1.toISOString(), t2:t2.toISOString()};
      run_analysis(data, function(results){
        // res.send(data);
        res.send(results);
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

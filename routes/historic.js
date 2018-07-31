var express = require('express');
var router = express.Router();
var cloud = require('../config/cloud');
var moment = require('moment');
var api = require('../utilities/api');
var database = require('../config/database');
// const request = require('request');
var analysis_db = database.get('carbonmeasurementapp_analysis');
var https = require('https');


router.get('/', function(req, res, next) {
  res.render('historic/index', { title: 'Historic Dashboard', currentUser: {id: req.user.id, username: req.user.username} });
});

router.get('/show/:id', function(req, res, next) {
  res.render('historic/show', { title: 'Historic Dashboard', eventId:req.params.id  ,currentUser: {id: req.user.id, username: req.user.username} });
});


router.get('/raw_data', function(req, res, next) {
  if(validate_date(req.query.date)){
    var db_name = api.get_database_name_from_date(req.query.date);
    var path = '/'+db_name+'/_design/iotp/_list/csv/by-deviceId?include_docs=true&key="'+req.query.deviceId+'"';
    // // Create a proxy to download the file from the DB
    // request({
    //   url: database.credentials.url + path,
    //   method: 'GET'
    // }).pipe(res);

    https.get(database.credentials.url + path, (csv_res) => {
      csv_res.on('data', (d) => {
        res.write(d);
      });
      csv_res.on('end', () => {
        res.end();
      });
      }).on('error', (e) => {
        console.error(e);
      });


  }
});


router.get('/data/:id', function(req, res, next) {
  // Calculate analysis
  data = {rows:[]};
  var query = api.getQuery(null, null, null, null, req.params.id);
  analysis_db.find(query, function(err, d){
    if(err) return res.send('Error');
    if(d.docs.length == 0) return res.send({rows:[]});
    event = d.docs[0];
    api.calculate_analysis(event.deviceId, event.timestamp, (error, results) =>{
      if(error) return res.sendStatus(error.statusCode);
      results.deviceId = event.deviceId;
      res.send(results);
    });
  });
});


router.get('/data', function(req, res, next){
  data = {rows:[]};
  if(validate_date(req.query.from) && validate_date(req.query.to)){
    var query = api.getQuery(req.query.from, moment(req.query.to).endOf('day').toISOString(), req.query.deviceId);
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

// function analyse_in_cloud(deviceId){
router.get('/test_analysis', function(req, res, next) {
  // ERROR AQUI! -> "2018-07-24T13:23:07.706"

  // Get analysis start time
  event = {
    // timestamp: '2018-07-25',
    timestamp: '2018-07-25T19:20:07.706860Z',
    // timestamp: '2018-07-22T11:20:07.706860Z',
  }
  deviceId = '11';

  api.get_analysis_start_time(deviceId, event, false,(error, timestamp) =>{
    api.calculate_analysis(deviceId, timestamp, (error, results) =>{
      // analysis = {timestamp, deviceId, baseline: results.results.baseline, max_temp: results.results.max_temp, total_carbon: results.results.total_carbon};
      res.send(results);
    });
  });

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

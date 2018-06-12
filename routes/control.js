var express = require('express');
var router = express.Router();
var createError = require('http-errors');
var https = require('https');
var auth = require('../config/auth');
var api = require('../utilities/api');
var cloud = require('../config/cloud');
var moment = require('moment');
var database = require('../config/database');

var controls = ['pump','band','oven','valve','licor','extp'];

function validate_job(job) {
  keys = ["id", "trigger", "actions"];
  for (var i in keys){
    if (!(keys[i] in job)) return null;
  }
  try {
    job = formatJob(job);
    job = formatActions(job);
  } catch (e) {
    return null;
  }
  return job;

}

function formatActions(job) {
  actions = job.actions;
  for (var i in actions) {
    if(actions[i][0]==='mode'){
      actions[i].push(null);
    }
    else if (actions[i][0] ==='analyse') {
      actions[i].push(null);
    }
    if(actions[i].length > 3){
      throw "Invald action!";
    }
  }
  return job
}


function formatJob(job) {
  for (var prop in job) {
    if (typeof job[prop] === 'string') {
      job[prop] = job[prop].toLowerCase();
    }
    else if (typeof job[prop] !== 'number') {
      formatJob(job[prop]);
    }
  }
  return job;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  req.pubsub.listAllDevicesOfType('instrument').then(
    function onSuccess (response) {
      instruments = response.results;
      instruments.connected = 0;
      for (instrument of instruments) {
        if(req.instruments[instrument.deviceId]){
          instrument.connection = req.instruments[instrument.deviceId].connection;
        }
        else{
          instrument.connection = "Disconnect";
        }
        if(instrument.connection == "Connect") instruments.connected++;
      }
      res.render('control/index', {
        title: "Control Dashboard",
        currentUser: {id: req.user.id, username: req.user.username} ,
        instruments: instruments
      });
    },
    function onError (error) {
      res.send(error);
    });
});

router.get('/:id/schedule', auth.isAdmin ,function(req, res, next){
  req.pubsub.getDevice('instrument', req.params.id).then(
    function onSuccess (instrument) {
      instrument.connection = req.instruments[req.params.id].connection;
      res.render('control/schedule', {
        title: "Schedule Instrument",
        currentUser: {id: req.user.id, username: req.user.username},
        controls,
        instrument
      });
    },
    function onError (error) {
      res.send(error);
    });
  // res.render('control/schedule', { title: 'schedule', controls, currentUser: {id: req.user.id, username: req.user.username}});
});

router.post('/:id/schedule/add', function(req, res, next){
  console.log(req.body);
  job = validate_job(req.body);
  console.log(job);
  if(job){
    job = {'action':'add','job': job};
    req.pubsub.publishDeviceCommand("instrument", req.params.id, 'job', "txt", job);
    res.redirect('back');
  }
  else{
    res.send("Invalid job format");
  }

});

router.get('/:id/getData', function(req, res, next) {
  // Get Historic Data to populate graph
  var name = 'iotp_'+cloud.config.org+'_default_'+ moment().format('YYYY-MM-DD');
  var db = database.get(name);
  var query = api.getQuery(moment().subtract(5, 'minutes').toISOString(), moment().toISOString(), req.params.id, 'reading');
  db.find(query, function(err, data){
    if (err) {
      res.send("Error");
    }
    else{
      data.rows = data.docs;
      res.send(data);
    }
  });
});


router.get('/:id', function(req, res, next) {
  req.pubsub.getDevice('instrument', req.params.id).then(
    function onSuccess (instrument) {
      instrument.connection = req.instruments[req.params.id].connection;
      res.render('control/show', {
        title: "Show Instrument",
        currentUser: {id: req.user.id, username: req.user.username},
        controls,
        instrument
      });
    },
    function onError (error) {
      res.send(error);
    });
});

module.exports = router;

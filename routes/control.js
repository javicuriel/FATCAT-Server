var express = require('express');
var router = express.Router();
var createError = require('http-errors');
var https = require('https');

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
      actions[i].push(null,null);
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
      if(job[prop]=='analyse'){
        job[prop] = ['analyse'];
      }
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

router.get('/:id/schedule', function(req, res, next){
  res.render('control/schedule', { title: 'schedule', controls, currentUser: {id: req.user.id, username: req.user.username}});
});

router.post('/:id/schedule/new', function(req, res, next){
  job = validate_job(req.body);
  if(job){
    req.pubsub.publishDeviceCommand("instrument", req.params.id, 'job', "txt", job);
    res.redirect('back');
  }
  else{
    res.send("Invalid job format")
  }

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

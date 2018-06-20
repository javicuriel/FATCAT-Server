var express = require('express');
var router = express.Router();
var api = require('../utilities/api');
var database = require('../config/database');
var jobs_db = database.get('carbonmeasurementapp_jobs');


function format_validate_job(job) {
  keys = ["deviceId","jobId", "trigger", "actions"];
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


router.get('/', function(req, res, next) {
  data = {rows:[]};
  // Get Jobs for deviceId
  var query = api.getQuery(null, null, req.query.deviceId);
  jobs_db.find(query, function(err, response){
    if(err) return res.send(err.statusCode);
    data.rows = response.docs
    res.send(data);
  });
});


router.get('/:id', function(req, res, next) {
  // Get Job ID
  var query = api.getQuery(null, null, null, null, req.params.id);
  jobs_db.find(query, function(err, response){
    if(err) return res.send(err.statusCode);
    res.send(response);
  });
});

router.post('/disable', function(req, res, next){
  deviceId = req.body.deviceId;
  jobId = req.body.jobId;
  api.findJob(jobs_db, deviceId, jobId, function(e, db_job){
    if(db_job){
      if (db_job.job.status == 'scheduled'){
        db_job.job.status = 'pending disable';
        jobs_db.insert(db_job, function(err, body, header) {
          if (err) return res.send(err.statusCode);
          req.pubsub.publishDeviceCommand("instrument", db_job.deviceId, 'job', "txt", {'action':'disable','job':{'jobId': jobId}}, 1);
          res.send(200);
        });
      }
      else{
        res.send(400);
      }
    }
  });
});

router.post('/delete', function(req, res, next){
  deviceId = req.body.deviceId;
  jobId = req.body.jobId;
  api.findJob(jobs_db, deviceId, jobId, function(e, db_job){
    if(db_job){
      if(db_job.job.status == 'disabled'){
        jobs_db.destroy(db_job._id, db_job._rev, function(error, response) {
          if(error) return console.log(error);
          res.send(200);
        });
      }
      else {
        db_job.job.status = 'pending delete';
        jobs_db.insert(db_job, function(err, body, header) {
          if (err) return res.send(err.statusCode);
          req.pubsub.publishDeviceCommand("instrument", db_job.deviceId, 'job', "txt", {'action':'delete','job':{'jobId': jobId}}, 1);
          res.send(200);
        });
      }
    }
  });
});

router.post('/add', function(req, res, next){
  // Adds null to actions arrays
  new_job = format_validate_job(req.body);
  if(new_job){
    deviceId = new_job.deviceId;
    delete new_job.deviceId;
    api.findJob(jobs_db, deviceId, new_job.jobId, function(e, db_job){
      if(e) return res.send(e.statusCode);
      // Create new job
      if(!db_job){
        job = {'deviceId': deviceId ,'job': new_job};
      }
      // Edit db job
      else{
        db_job.old_job = db_job.job;
        db_job.job = new_job;
        job = db_job;
      }
      job.job.status = 'pending activation';
      jobs_db.insert(job, function(err, body, header) {
        if (err) return res.send(err.statusCode);
        req.pubsub.publishDeviceCommand("instrument", job.deviceId, 'job', "txt", {'action':'add','job': job.job}, 1);
        res.redirect('back');
      });
    });
  }
  else{
    res.send("Invalid job format");
  }
});

module.exports = router;

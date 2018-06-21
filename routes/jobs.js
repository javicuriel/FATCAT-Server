var express = require('express');
var router = express.Router();
var api = require('../utilities/api');
var database = require('../config/database');
var jobs_db = database.get('carbonmeasurementapp_jobs');


function format_validate_job(job) {
  keys = ["deviceId" ,"jobId" , "trigger", "actions"];
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

// router.get('/test', function(req, res, next) {
//   for (var i = 0; i < 99; i++) {
//     jobs_db.get('cc2922f7ca9ec908d9b3ce8ee718f954', function(err, job){
//       if(err){
//         console.log(err);
//       }
//       else {
//         console.log(job._id);
//       }
//     });
//   }
//
// });

router.post('/:id/disable', function(req, res, next){
  jobs_db.get(req.params.id, function(err, db_job){
    if(db_job){
      if (db_job.job.status == 'scheduled'){
        db_job.job.status = 'pending disable';
        jobs_db.insert(db_job, function(err, body, header) {
          if (err) return res.send(err.statusCode);
          req.pubsub.publishDeviceCommand("instrument", db_job.deviceId, 'job', "txt", {'action':'disable','job':{'jobId': db_job.job.jobId}}, 1);
          res.send(200);
        });
      }
      else{
        res.send(400);
      }
    }
  });
});

router.post('/:id/delete', function(req, res, next){
  jobs_db.get(req.params.id, function(err, db_job){
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
          req.pubsub.publishDeviceCommand("instrument", db_job.deviceId, 'job', "txt", {'action':'delete','job':{'jobId': db_job.job.jobId}}, 1);
          res.send(200);
        });
      }
    }
  });
});

router.post('/:id/edit', function(req, res, next){
  var edit_job = format_validate_job(req.body);
  jobs_db.get(req.params.id, function(err, db_job){
    if(db_job){
      // Add new old_job -> pending delete
      var old_job = JSON.parse(JSON.stringify(db_job));
      old_job._id = old_job._id+'_old';
      old_job.jobId = old_job.jobId+'_old';
      old_job.status = 'pending delete';
      delete old_job._rev;

      // Edit job -> pending substitution
      db_job.trigger = edit_job.trigger;
      db_job.actions = edit_job.actions;
      db_job.status = 'pending substitution';

      jobs_db.bulk({docs:[old_job,db_job]}, function(err, body) {
        res.send(body);
      });
    }
  });
});

router.post('/add', function(req, res, next){
  // Adds null to actions arrays
  var new_job = format_validate_job(req.body);
  if(new_job){
    new_job._id = new_job.deviceId+'_'+new_job.jobId;
    new_job.status = 'pending activation';
    jobs_db.get(new_job._id, function(e, db_job){
      // Create new job
      if(!db_job){
        jobs_db.insert(new_job, function(err, body, header) {
          if (err) return res.send(err.statusCode);
          // req.pubsub.publishDeviceCommand("instrument", job.deviceId, 'job', "txt", {'action':'add','job': new_job}, 1);
          res.send(body);
          // res.redirect('back');
        });
      }
      else{
        res.send("ID already exists!");
      }
      // Edit db job
      // else{
      //   db_job.old_job = db_job.job;
      //   db_job.job = new_job;
      //   job = db_job;
      // }
      // job.job.status = 'pending activation';
      // jobs_db.insert(job, function(err, body, header) {
      //   console.log(body);
      //   if (err) return res.send(err.statusCode);
      //   req.pubsub.publishDeviceCommand("instrument", job.deviceId, 'job', "txt", {'action':'add','job': job.job}, 1);
      //   res.redirect('back');
      // });
    });
  }
  else{
    res.send("Invalid job format");
  }
});

module.exports = router;

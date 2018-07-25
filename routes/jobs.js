var express = require('express');
var router = express.Router();
var api = require('../utilities/api');
var database = require('../config/database');
var jobs_db = database.get('carbonmeasurementapp_jobs');


function format_validate_job(job, edit = false) {
  keys = ["trigger", "actions"];
  if (!edit){
    keys.push("deviceId");
    keys.push("jobId");
  }
  for (var i in keys){
    if (!(keys[i] in job)) return null;
  }
  try {
    if(job.jobId){
      // Remove spaces with underscores
      job.jobId = job.jobId.split(' ').join('_');
    }
    job = formatJob(job);
    job = formatActions(job);
    if(job.trigger[0] == 'date') job.trigger[1] = new Date(job.trigger[1]).toISOString()
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
    else if (actions[i] ==='analyse') {
      actions[i] = ['analyse', null, null]
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
    data.rows = response.docs;
    passed = []
    data.rows.forEach(function(job){
      if(job.trigger[0] == 'date' ){
        date = new Date(job.trigger[1]);
        now = new Date();
        job.status = 'disabled - Passed time';
        if(date < now) passed.push(job);
      }
    });
    if(passed.length == 0){
      res.send(data);
    }
    else{
      jobs_db.bulk({docs:passed}, function(err, body) {
        res.send(data);
      });
    }
  });
});


router.get('/:id', function(req, res, next) {
  // Get Job ID
  jobs_db.get(req.params.id, function(err, db_job){
    if(err) return res.send(err.statusCode);
    res.send(db_job);
  });
});


router.post('/:id/disable', function(req, res, next){
  jobs_db.get(req.params.id, function(err, db_job){
    if(db_job){
      status = db_job.status.split(' ')[0];
      if (status == 'scheduled'){
        db_job.status = 'pending disable';
        db_job.mqtt_message = {'action':'disable'};
        jobs_db.insert(db_job, function(err, body, header) {
          if (err) return res.send(err.statusCode);
          event = {'action':'disable','job': {'_id': db_job._id}}
          req.pubsub.publishDeviceCommand("instrument", db_job.deviceId, 'job', "txt", event, 1);
          res.send(event);
        });
      }
      else{
        res.send("Job not scheduled");
      }
    }
  });
});

router.post('/:id/enable', function(req, res, next){
  jobs_db.get(req.params.id, function(err, db_job){
    if(db_job){
      status = db_job.status.split(' ')[0];
      if (status == 'disabled'){
        db_job.status = 'pending enable';
        db_job.mqtt_message = {'action':'add'};
        jobs_db.insert(db_job, function(err, body, header) {
          if (err) return res.send(err.statusCode);
          req.pubsub.publishDeviceCommand("instrument", db_job.deviceId, 'job', "txt", {'action':'add','job': db_job}, 1);
          res.send(200);
        });
      }
      else{
        res.send("Job is not disabled!");
      }
    }
    else{
      res.send(404);
    }
  });
});

router.post('/:id/delete', function(req, res, next){
  jobs_db.get(req.params.id, function(err, db_job){
    if(db_job){
      status = db_job.status.split(' ')[0];
      if(status == 'disabled'){
        jobs_db.destroy(db_job._id, db_job._rev, function(error, response) {
          if(error) return console.log(error);
          res.send(200);
        });
      }
      else if (status == 'scheduled') {
        db_job.status = 'pending delete';
        db_job.mqtt_message = {'action':'delete'};
        jobs_db.insert(db_job, function(err, body, header) {
          if (err) return res.send(err.statusCode);
          event = {'action':'delete','job': {'_id': db_job._id}}
          req.pubsub.publishDeviceCommand("instrument", db_job.deviceId, 'job', "txt", event, 1);
          res.send(event);
        });
      }
    }
  });
});

router.post('/:id/refreshState', function(req, res, next){
  jobs_db.get(req.params.id, function(err, db_job){
    if(db_job && db_job.mqtt_message){
      message = JSON.parse(JSON.stringify(db_job.mqtt_message));
      if(message.action == 'add'){
        message['job'] = db_job;
      }
      else{
        message.job = {'_id': db_job._id};
      }
      req.pubsub.publishDeviceCommand("instrument", db_job.deviceId, 'job', "txt", message, 1);
      res.send(200);
    }
  });
});

router.post('/:id/edit', function(req, res, next){
  var edit_job = format_validate_job(req.body, true);
  jobs_db.get(req.params.id, function(err, db_job){
    if(db_job){
      status = db_job.status.split(' ')[0];
      if(!(status == 'scheduled' || status == 'disabled')) return res.send("Cannot edit pending jobs");
      var old_job = JSON.parse(JSON.stringify(db_job));
      db_job.trigger = edit_job.trigger;
      db_job.actions = edit_job.actions;


      if(status == 'disabled'){
        db_job.status = 'pending activation';
        db_job.mqtt_message = {'action':'add'};
        jobs_db.insert(db_job, function(d_err, d_body, d_header) {
          if(d_err) return res.send(d_err);
          req.pubsub.publishDeviceCommand("instrument", db_job.deviceId, 'job', "txt", {'action':'add', 'job': db_job}, 1);
          res.redirect('back');
        });
      }
      else{
        db_job.status = 'pending substitution';
        // Add new old_job -> pending delete
        old_job._id = old_job._id+'_old';
        old_job.jobId = old_job.jobId+'_old';
        old_job.status = 'pending delete';
        delete old_job._rev;
        old_job.mqtt_message = {'action':'delete'};

        jobs_db.insert(old_job, function(o_err, o_body, o_header) {
          if(o_err) return res.send(o_err);
          db_job.old = o_body;
          db_job.mqtt_message = {'action':'add'};
          jobs_db.insert(db_job, function(d_err, d_body, d_header) {
            if(d_err) return res.send(d_err);
            req.pubsub.publishDeviceCommand("instrument", db_job.deviceId, 'job', "txt", {'action':'add','job': db_job}, 1);
            // res.send({o_body, d_body});
            res.redirect('back');
          });
        });
      }
    }
    else{
      res.send(404);
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
        new_job.mqtt_message = {'action':'add'};
        jobs_db.insert(new_job, function(err, body, header) {
          if (err) return res.send(err.statusCode);
          req.pubsub.publishDeviceCommand("instrument", new_job.deviceId, 'job', "txt", {'action':'add','job': new_job}, 1);
          // res.send(new_job);
          res.redirect('back');
        });
      }
      else{
        res.send("ID already exists!");
      }
    });
  }
  else{
    res.send("Invalid job format");
  }
});

module.exports = router;

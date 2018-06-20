var ibmiot = require("ibmiotf");
var cloud_settings = require('./cloud');
var pubsub = new ibmiot.IotfApplication(cloud_settings.config);
var database = require('./database')
var analysis_db = database.get('carbonmeasurementapp_analysis');
var api = require('../utilities/api');

module.exports = function(socket_io, instruments){

  var sockets = require('./sockets')(socket_io, instruments, pubsub);

  pubsub.on("connect", function () {
    console.log("IOT connected");
    pubsub.subscribeToDeviceStatus("instrument");
    pubsub.subscribeToDeviceEvents("instrument","+","analysis","json");
    pubsub.subscribeToDeviceEvents("instrument","+","job","json");
    sockets.reload.emit('reload');
  });

  pubsub.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload) {
    event = JSON.parse(payload.toString());
    switch (eventType) {
      case 'reading':
        event.timestamp = new Date(event.timestamp).getTime();
        sockets.control.to(deviceId).emit('data', event);
        break;
      case 'jobs':
        sockets.jobs.to(deviceId).emit('all', event);
        break;
      case 'job':
        update_job_status(deviceId, event);
        break;
      case 'analysis':
        event['deviceId'] = deviceId;
        analysis_db = database.get('carbonmeasurementapp_analysis');
        analysis_db.insert(event, function(err, body, header) {
          if (err) {
            console.log(err);
          }
        });
        break;
      default:
        break;
    }

  });

  pubsub.on("deviceStatus", function (deviceType, deviceId, payload, topic) {
    instrument = JSON.parse(payload);

    instruments.validate_id(deviceId, ()=>{
      instruments[deviceId].connection = instrument.Action;
    });

    update_data = {id:deviceId, connection:instrument.Action}

    sockets.status.to(deviceId).emit('status_update', update_data);
    sockets.status.to('all').emit('status_update', update_data);
  });

  return pubsub;
};

  function delete_job(deviceId, jobId){
  jobs_db = database.get('carbonmeasurementapp_jobs');
  api.findJob(jobs_db, deviceId, jobId, function(e, db_job){
    if(!db_job) return console.log(e);
    jobs_db.destroy(db_job._id, db_job._rev, function(error, res) {
      if(error) return console.log(error);
    });
  });
}

function update_job_status(deviceId, job_event){
  if(job_event.action == 'delete') return delete_job(deviceId, job_event.job.jobId);

  jobs_db = database.get('carbonmeasurementapp_jobs');
  api.findJob(jobs_db, deviceId, job_event.job.jobId, function(e, db_job){
    if(!db_job) return console.log("Error");
    switch (job_event.action) {
      case 'add':
        db_job.job = job_event.job;
        db_job.job.status = 'scheduled';
        if(db_job.old_job) delete db_job.old_job;
        break;
      case 'disable':
        db_job.job.status = 'disabled';
        break;
    }
    jobs_db.insert(db_job, function(err, body, header) {
      if (err) return res.send(err.statusCode);
    });
  });
}

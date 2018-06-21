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
        update_job_status(event);
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


function update_job_status(job_event){
  jobs_db = database.get('carbonmeasurementapp_jobs');

  if(job_event.action == 'delete'){
    jobs_db.get(job_event._id, function(err, db_job){
      if(err) return console.log("Error in lookup");
      jobs_db.destroy(db_job._id, db_job._rev, function(error, res) {
        if(error) return console.log("Error in delete");
      });
    });
  }
  else{
    jobs_db.get(job_event._id, function(err, db_job){
      if(!db_job) return console.log("Error in lookup 2");
      switch (job_event.action) {
        case 'add':
          db_job.trigger = job_event.job.trigger;
          db_job.actions = job_event.job.actions;
          db_job.status = 'scheduled';
          // If old exists -> delete
          if(db_job.old){
            jobs_db.destroy(db_job.old.id, db_job.old.rev, function(error, res) {
              if(error) return console.log(error);
            });
            delete db_job.old;
          }
          break;
          case 'disable':
          db_job.status = 'disabled';
          break;
        }
        jobs_db.insert(db_job, function(err, body, header) {
          if (err) return console.log("Error" + err.statusCode);
        });
      });
  }
}

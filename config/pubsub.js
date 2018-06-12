var ibmiot = require("ibmiotf");
var cloud_settings = require('./cloud');
var pubsub = new ibmiot.IotfApplication(cloud_settings.config);
var analysis_db = require('./database').get('carbonmeasurementapp_analysis');

module.exports = function(socket_io, instruments){

  var sockets = require('./sockets')(socket_io, instruments, pubsub);

  pubsub.on("connect", function () {
    console.log("IOT connected");
    pubsub.subscribeToDeviceStatus("instrument");
    sockets.reload.emit('reload');
  });

  pubsub.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload) {
    event = JSON.parse(payload.toString());
    switch (eventType) {
      case 'reading':
        event.timestamp = new Date(event.timestamp+'Z').getTime();
        sockets.control.to(deviceId).emit('data', event);
        break;
      case 'jobs':
        sockets.jobs.to(deviceId).emit('all', event);
        break;
      case 'analysis':
        event['deviceId'] = deviceId;
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

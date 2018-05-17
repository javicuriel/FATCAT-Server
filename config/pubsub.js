var ibmiot = require("ibmiotf");
var cloud_settings = require('./cloud');
var pubsub = new ibmiot.IotfApplication(cloud_settings.config);

module.exports = function(socket_io, instruments){

  var sockets = require('./sockets')(socket_io, instruments, pubsub);

  pubsub.on("connect", function () {
    console.log("IOT connected");
    pubsub.subscribeToDeviceStatus("instrument");
    sockets.reload.emit('reload');
  });

  pubsub.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload) {
    event = JSON.parse(payload.toString());
    if(eventType == 'reading'){
      event.timestamp = new Date(event.timestamp+'Z').getTime();
      sockets.control.to(deviceId).emit('data', event);
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

var https = require('https');
var cloud_settings = require('./cloud');
var api = cloud_settings.api;

var instruments = module.exports = {
  // Initiate instruments module that mantains a hash table with the
  // instruments name, instrument status (connection) the count of users requesting live data
  init : function (pubsub) {
    pubsub.listAllDevicesOfType('instrument').then(
      function onSuccess (response) {
        response.results.forEach(function(instrument){
          instruments[instrument.deviceId] = {users: 0, connection: null};
        });
        pubsub.connect();
      },
      function onError (error) {
        res.send(error);
    });
  },
  // When at least one user requests live data, app will subscribe to device events
  add_request_device_data : function (id, pubsub) {
    instruments[id].users += 1;
    if(instruments[id].users == 1){
      pubsub.subscribeToDeviceEvents("instrument",id,"reading","json");
      pubsub.subscribeToDeviceEvents("instrument",id,"jobs","json");

    }
  },
  // When last user closes websocket to live data, app will unsubscribe to device events
  delete_request_device_data : function (id, pubsub) {
    instruments[id].users -= 1;
    if (instruments[id].users == 0){
      pubsub.unsubscribeToDeviceEvents("instrument",id,"reading","json");
      pubsub.unsubscribeToDeviceEvents("instrument",id,"jobs","json");
    }
  },
  // Validates instrument id
  // TODO: add error for success_callback
  validate_id : function(id, success_callback) {
    if (id in instruments){
      success_callback();
    }
    else{
      api.path = api.base_path + 'device/types/instrument/devices/' + id;
      var http_req = https.get(api, function(http_res) {
        if (http_res.statusCode == 200){
          instruments[id] = {users: 0, connection: null};
          success_callback();
        }
      });
    }
  }
}

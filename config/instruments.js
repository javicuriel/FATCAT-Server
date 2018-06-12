var https = require('https');
var cloud_settings = require('./cloud');
var api = cloud_settings.api;

var instruments = module.exports = {
  init : function (pubsub) {
    pubsub.listAllDevicesOfType('instrument').then(
      function onSuccess (response) {
        response.results.forEach(function(instrument){
          instruments[instrument.deviceId] = {users: 0, connection: null};
        });
        pubsub.connect();
        pubsub.on('connect', function () {
          pubsub.subscribeToDeviceEvents("instrument","+","analysis","json");
        });
      },
      function onError (error) {
        res.send(error);
    });
  },
  add_request_device_data : function (id, pubsub) {
    instruments[id].users += 1;
    if(instruments[id].users == 1){
      pubsub.subscribeToDeviceEvents("instrument",id,"reading","json");
    }
  },
  delete_request_device_data : function (id, pubsub) {
    instruments[id].users -= 1;
    if (instruments[id].users == 0){
      pubsub.unsubscribeToDeviceEvents("instrument",id,"reading","json");
    }
  },
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

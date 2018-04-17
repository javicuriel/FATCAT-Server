var https = require('https');
var cloud_settings = require('./cloud');
var api = cloud_settings.api;

var instruments = module.exports = {
  init : function (pubsub) {
    api.path = api.base_path + `bulk/devices/?typeId=instrument`;
    https.get(api, function(http_res) {
      var data = [];
      if (http_res.statusCode == 200){
        http_res.on('data', function(chunk) {
          data.push(chunk);
        });
        http_res.on('end',function(){
          JSON.parse(data).results.forEach(function(instrument){
            instruments[instrument.deviceId] = {users: 0, connection: null};
          });
          pubsub.connect();
        });
      }
      else{
        console.log("Error" + http_res.statusCode);
      }
    });
  },
  add_request_device_data : function (id, pubsub) {
    instruments[id].users += 1;
    if(instruments[id].users == 1){
      pubsub.subscribeToDeviceEvents("instrument",id,"+","json");
    }
  },
  delete_request_device_data : function (id, pubsub) {
    instruments[id].users -= 1;
    if (instruments[id].users == 0){
      pubsub.unsubscribeToDeviceEvents("instrument",id,"+","json");
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

var express = require('express');
var router = express.Router();

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function validate_body(body){
  return (
    (body.deviceId != null && body.deviceId != "") &&
    (body.location != null && body.location != "") &&
    isNumber(body.lat) &&
    isNumber(body.long)
  );
}

// All devices
router.get('/', function(req, res, next) {
  req.pubsub.listAllDevicesOfType('instrument').then(
    function onSuccess (response) {
      res.send(response);
    },
    function onError (error) {
      res.send(error);
    });
});

// All device with :id
router.get('/:id', function(req, res, next) {
  req.pubsub.getDevice('instrument', req.params.id).then(
    function onSuccess (response) {
      res.send(response);
    },
    function onError (error) {
      res.send(error);
    });
});

// Edit device with :id
router.get('/:id/edit', function(req, res, next){
  // Set body and deviceId for validation
  req.body = req.query;
  req.body.deviceId = req.params.id;
  if(validate_body(req.body)){
    deviceInfo = {type: "instrument", deviceId: req.body.deviceId, info: {"descriptiveLocation": req.body.location}, metadata: {"coordinates": [req.body.lat, req.body.long]}};
    req.pubsub.updateDevice(deviceInfo.type, deviceInfo.deviceId, deviceInfo.info, null, deviceInfo.metadata, null).then(
      function onSuccess (response) {
        res.redirect('back');
      },
      function onError (error) {
        res.send(error);
    });
  }
});

// Delete device with :id
router.post('/:id/delete', function(req, res, next){
  req.pubsub.unregisterDevice('instrument', req.params.id).then(
    function onSuccess (response) {
      delete req.instruments[req.params.id];
      res.redirect('back');
    },
    function onError (error) {
      res.send(error);
    });
});

// Add new device
router.post('/add', function(req, res, next){
  if(validate_body(req.body)){
    deviceInfo = {type: "instrument", deviceId: req.body.deviceId, info: {"descriptiveLocation": req.body.location}, metadata: {"coordinates": [req.body.lat, req.body.long]}};
    req.pubsub.registerDevice(deviceInfo.type, deviceInfo.deviceId, null, deviceInfo.info, null, deviceInfo.metadata).then (
      function onSuccess (response) {
        res.send(response.authToken);
      },
      function onError (error) {
        res.status(error.status).send(error);
    });
  }
  else{
    res.status(409).send("Invalid parameters (Check Lat & Long are numbers and deviceId & location not empty)");
  }
});

module.exports = router;

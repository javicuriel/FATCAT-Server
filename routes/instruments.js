var express = require('express');
var router = express.Router();

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}


router.get('/', function(req, res, next) {
  req.pubsub.listAllDevicesOfType('instrument').then(
    function onSuccess (response) {
      res.send(response);
    },
    function onError (error) {
      res.send(error);
    });
});

router.get('/:id', function(req, res, next) {
  req.pubsub.getDevice('instrument', req.params.id).then(
    function onSuccess (response) {
      res.send(response);
    },
    function onError (error) {
      res.send(error);
    });
});

// Edit
router.put('/:id', function(req, res, next){
  // TODO
});

// Delete
router.delete('/:id', function(req, res, next){
  req.pubsub.unregisterDevice('instrument', req.params.id).then(
    function onSuccess (response) {
      res.send(response);
    },
    function onError (error) {
      res.send(error);
    });
});



router.post('/add', function(req, res, next){
  if(isNumber(req.query.lat) && isNumber(req.query.long)){
    deviceInfo = {type: "instrument", deviceId: req.query.deviceId, info: {"descriptiveLocation": req.query.location}, metadata: {"coordinates": [req.query.lat, req.query.long]}};
    req.pubsub.registerDevice(deviceInfo.type, deviceInfo.deviceId, null, deviceInfo.info, null, deviceInfo.metadata).then (
      function onSuccess (response) {
        // console.log(response.authToken);
        res.send(response);
      },
      function onError (error) {
        res.send(error);
    });
  }

});

module.exports = router;

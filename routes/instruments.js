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
  if(isNumber(req.body.lat) && isNumber(req.body.long)){
    deviceInfo = {type: "instrument", deviceId: req.body.deviceId, info: {"descriptiveLocation": req.body.location}, metadata: {"coordinates": [req.body.lat, req.body.long]}};
    req.pubsub.registerDevice(deviceInfo.type, deviceInfo.deviceId, null, deviceInfo.info, null, deviceInfo.metadata).then (
      function onSuccess (response) {
        res.send(response.authToken);
      },
      function onError (error) {
        res.send(error);
    });
  }
  else{
    console.log("NOSOSON NUMEROS");
    console.log(req.body);
  }

});

module.exports = router;

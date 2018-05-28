var express = require('express');
var router = express.Router();
var createError = require('http-errors');
var https = require('https');

var controls = ['pump','band','oven','valve','licor','extp'];

/* GET home page. */
router.get('/', function(req, res, next) {

  req.pubsub.listAllDevicesOfType('instrument').then(
    function onSuccess (response) {
      instruments = response.results;
      instruments.connected = 0;
      for (instrument of instruments) {
        if(req.instruments[instrument.deviceId]){
          instrument.connection = req.instruments[instrument.deviceId].connection;
        }
        else{
          instrument.connection = "Disconnect";
        }
        if(instrument.connection == "Connect") instruments.connected++;
      }
      res.render('control/index', {
        title: "Control Dashboard",
        currentUser: req.user.id,
        instruments: instruments
      });
    },
    function onError (error) {
      res.send(error);
    });
});

router.get('/schedule', function(req, res, next){
  res.render('control/schedule', { title: 'schedule', currentUser: req.user.id});
});


router.get('/:id', function(req, res, next) {
  req.pubsub.getDevice('instrument', req.params.id).then(
    function onSuccess (instrument) {
      instrument.connection = req.instruments[req.params.id].connection;
      res.render('control/show', {
        title: "Show Instrument",
        currentUser: req.user.id,
        controls,
        instrument
      });
    },
    function onError (error) {
      res.send(error);
    });
});

module.exports = router;

var express = require('express');
var router = express.Router();
var createError = require('http-errors');
var https = require('https');

var controls = ['pump','band','oven','valve','licor','extp'];


/* GET home page. */
router.get('/', function(req, res, next) {
  res.api.path = res.api.base_path + `bulk/devices/?typeId=instrument`;
  var http_req = https.get(res.api, function(http_res) {
    var data = [];
    if (http_res.statusCode == 200){
      http_res.on('data', function(chunk) {
        data.push(chunk);
      });
      http_res.on('end',function(){
        api_instruments = JSON.parse(data).results;
        res.render('control/index', {
          title: "Control Dashboard",
          currentUser: req.user.id,
          instruments: api_instruments
        });
      });
    }
    else{
      next();
    }
  });
});


router.get('/:id', function(req, res, next) {
  res.api.path = res.api.base_path + `device/types/instrument/devices/${req.params.id}`;
  var http_req = https.get(res.api, function(http_res) {
    var data = [];
    if (http_res.statusCode == 200){
      http_res.on('data', function(chunk) {
        data.push(chunk);
      });
      http_res.on('end',function(){
        instrument = JSON.parse(data);
        instrument.connection = res.instruments[req.params.id].connection;
        res.render('control/show', {
          title: "Show Instrument",
          currentUser: req.user.id,
          controls,
          instrument
        });
      });
    }
    else{
      next();
    }
  });
});

module.exports = router;

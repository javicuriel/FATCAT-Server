var express = require('express');
var router = express.Router();
var createError = require('http-errors');
var https = require('https');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('control/index', { title: 'Control Dashboard' });
});


router.get('/:id', function(req, res, next) {
  res.api.path += `device/types/instrument/devices/${req.params.id}`;
  var http_req = https.get(res.api, function(http_res) {
    var data = [];
    if (http_res.statusCode == 200){
      http_res.on('data', function(chunk) {
        data.push(chunk);
      });
      http_res.on('end',function(){
        instrument = JSON.parse(data);
        console.log(instrument);
        res.render('control/show', {
          title: "Show Intstrument",
          instrument
        });
      });
    }
    else{
      next();
    }
  });

  // console.log(result.statusCode);
  // if(result.statusCode == 200){
  //   res.render('control/show', {
  //     title: "Show Intstrument",
  //     instrument: {
  //       id: req.params.id,
  //       location: "Jungfraujoch",
  //       latitude: "46.5482747",
  //       longitude: "7.9631338"
  //     }
  //   });
  // }
  // else{
  //   next();
  // }
});

module.exports = router;

var express = require('express');
var router = express.Router();
var createError = require('http-errors');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('control/index', { title: 'Control Dashboard' });
});

function validate_id(id){
  if(id == 1){
    return false;
  }
  else {
    return true;
  }
}

router.get('/:id', function(req, res, next) {
  // res.get_device_data(req.params.id);


  if(validate_id(req.params.id)){
    res.render('control/show', {
      title: "Show Intstrument",
      instrument: {
        id: req.params.id,
        location: "Jungfraujoch",
        latitude: "46.5482747",
        longitude: "7.9631338"
      }
    });
  }
  else{
    next();
  }
});

module.exports = router;

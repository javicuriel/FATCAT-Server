var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('control/index', { title: 'Control Dashboard' });
});

router.get('/:id', function(req, res, next) {
  res.get_device_data(req.params.id);
  
  // iotClient.subscribeToDeviceEvents("instrument");
  res.render('control/show', {
    title: "Show Intstrument",
    instrument: {
      id: req.params.id,
      location: "Jungfraujoch",
      latitude: "46.5482747",
      longitude: "7.9631338"
    }
  });
});

module.exports = router;

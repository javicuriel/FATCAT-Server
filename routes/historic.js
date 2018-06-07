var express = require('express');
var router = express.Router();
var cloud = require('../config/cloud');
var moment = require('moment');
var api = require('../utilities/api');



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('historic/index', { title: 'Historic Dashboard', currentUser: {id: req.user.id, username: req.user.username} });
});

router.get('/fatcat', function(req, res, next){
  res.sendFile('test_data.json', {root: './temp'});
});

router.get('/data', function(req, res, next){
  data = {rows:[]};
  if(validate_date(req.query.from) && validate_date(req.query.to)){
    databases = getDatabasebyDates(req.query.from, req.query.to);
    if(databases.length == 0){
      res.send(data);
      return;
    }
    total_rows = databases.length;
    view ='/_design/iotp/_view/by-eventType?key="analysis"'
    databases.forEach(function(db){
      api.getBody(db+view, function(status, body){
        if (status == 200){
          body.rows.forEach(function (row) {
            data.rows.push({
              total_carbon: row.value.data.total_carbon,
              max_temp: row.value.data.max_temp,
              date: row.value.data.timestamp+'Z',
              baseline: row.value.data.baseline,
              deviceId: row.value.deviceId,
              timestamp: new Date(row.value.data.timestamp+'Z').getTime()
            });
          });
          --total_rows;
          if(total_rows <= 0){
            res.setHeader('Content-Type', 'application/json');
            data.rows.sort(function(a, b){return a.timestamp - b.timestamp});
            res.send(data);
          }
        }
        else{
          --total_rows;
          console.log(status);
        }
      });
    });
  }
  else{
    res.send(data);
  }
});

function getDatabasebyDates(start, end) {
    var base = 'iotp_'+cloud.config.org+'_default_';
    var dateArray = [];
    var currentDate = moment(start);
    var endDate = moment(end);

    var min = moment('2018-06-01')

    while (currentDate <= endDate || currentDate.isSame(end, 'month')) {
        if(currentDate >= min){
          dateArray.push(base + moment(currentDate).format('YYYY-MM') )
        }
        currentDate = moment(currentDate).add(1, 'months');
    }

    return dateArray;
}


function validate_date(date){
  d = moment(date, moment.ISO_8601);
  if (!d.isValid()){
    return false;
  }
  else{
    return true;
  }
}

module.exports = router;

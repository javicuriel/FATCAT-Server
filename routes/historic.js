var express = require('express');
var router = express.Router();
var credentials = require('../dbcredentials');
var https = require('https');
var moment = require('moment');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('historic/index', { title: 'Historic Dashboard', currentUser: req.user.id });
});

router.get('/dc', function(req, res, next) {
  res.render('historic/dc', { title: 'DC Dashboard', currentUser: req.user.id });
});

router.get('/smoothie', function(req, res, next) {
  res.render('historic/smoothie', { title: 'SmoothieChart', currentUser: req.user.id });
});

router.get('/fatcat', function(req, res, next){
  res.sendFile('test_data.json', {root: './temp'});
});

router.get('/data', function(req, res, next){
  data = {"cols":[{"id":"dt","label":"Datetime","type":"date"},{"id":"tc","label":"Total Carbon (ug)","type":"number"},{"id":"tempoven","label":"Temperature (degC)","type":"number"},{"id":"co2base","label":"CO2 baseline (ppm)","type":"number"},{"id":"year","label":"Year","type":"number"},{"id":"month","label":"Month","type":"number"},{"id":"day","label":"Day","type":"number"},{"id":"timeofday","label":"Time","type":"timeofday"},{"id":"runtime","label":"Instrument runtime (s)","type":"number"},{"id":"id","label":"Event ID","type":"string"},{"id":"link","label":"Event Detail","type":"string"}],
  rows:[]
  };
  if(validate_date(req.query.from) && validate_date(req.query.to)){
    databases = getDatabasebyDates(req.query.from, req.query.to);
    all_rows = []
    total_rows = databases.length;
    databases.forEach(function(db){
      view ='/_design/iotp/_view/by-eventType?key="analysis"'
      url = credentials.url + '/' + db + view;
      https.get(url, function(http_res) {
        var body = new Buffer(0);
        if (http_res.statusCode == 200){
          http_res.on('data', function(chunk) {
            body = Buffer.concat( [ body, chunk ] );
          });
          http_res.on('end',function(){
            JSON.parse(body).rows.forEach(function (row) {
              row = format_row(row);
              data.rows.push(row);
              // all_rows.push(row.value.data);
            });
            --total_rows;
            if(total_rows <= 0){
              res.setHeader('Content-Type', 'application/json');
              res.send(data);
              // res.send(all_rows);
            }
          });
        }
        else{
          console.log("Error" + http_res.statusCode);
        }
      });
    });
  }
  else{
    res.send("Invalid Date");
  }
});

function format_row(row){
  r = {c:[]};
  date = new Date(row.value.data.timestamp);
  date_string = "Date("+date.getFullYear()+", "+date.getMonth()+", "+date.getDay()+", "+date.getHours()+", "+date.getMinutes()+", "+date.getSeconds()+")"
  r.c.push({v:date_string});
  r.c.push({v:row.value.data.total_carbon});
  r.c.push({v:row.value.data.max_temp});
  r.c.push({v:1.5});
  r.c.push({v:date.getFullYear()});
  r.c.push({v:date.getMonth()});
  r.c.push({v:date.getDay()});
  day = date.getHours()+" "+date.getMinutes()+" "+date.getSeconds();
  r.c.push({v:day});
  r.c.push({v:0});
  r.c.push({v:row.value._id});
  r.c.push({v:'<a href="#">Link</a>'});
  return r;
}

// Using moment
function getDatabasebyDates(startDate, stopDate) {
    var base = 'iotp_kbld7d_default_';
    var dateArray = [];
    var currentDate = moment(startDate);
    var stopDate = moment(stopDate);
    while (currentDate <= stopDate) {
        dateArray.push(base + moment(currentDate).format('YYYY-MM-DD') )
        currentDate = moment(currentDate).add(1, 'days');
    }
    return dateArray;
}


function validate_date(date){
  min = moment('2018-03-30');
  max = moment();
  d = moment(date, moment.ISO_8601);
  if (!d.isValid() || date < min || date > max){
    return false;
  }
  else{
    return true;
  }
}

module.exports = router;

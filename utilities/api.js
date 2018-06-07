var https = require('https');
var credentials = require('../config/database').credentials;





module.exports = {
  postBody: function(route, deviceId, startDate, endDate ,callback){
    var query = {
      "selector": {
        "deviceId": deviceId,
        "eventType": "reading",
        "timestamp": {
          "$gte": startDate,
          "$lt": endDate
        }
      }
    };
    query = JSON.stringify(query);
    var options = {
      hostname: credentials.host,
      port: 443,
      path: '/'+route,
      method: 'POST',
      headers: {
           'Content-Type': 'application/json',
           'Content-Length': query.length,
           'Authorization': 'Basic ' + new Buffer(credentials.username + ':' + credentials.password).toString('base64')
         }
    };
    var body = new Buffer(0);
    var req = https.request(options, (res) => {
      res.on('data', (chunk) => {
        body = Buffer.concat( [ body, chunk ] );
      });
      res.on('end', () => {
        callback(res.statusCode, JSON.parse(body));
      });
    });
    req.on('error', (e) => {
      console.error(e);
    });
    req.write(query);
    req.end();
  },
  getBody: function(route, callback){
    https.get(credentials.url + '/' + route, function(http_res) {
      var body = new Buffer(0);
      if (http_res.statusCode == 200){
        http_res.on('data', function(chunk) {
          body = Buffer.concat( [ body, chunk ] );
        });
        http_res.on('end',function(){
          callback(http_res.statusCode, JSON.parse(body));
        });
      }
      else{
        callback(http_res.statusCode, null);
      }
    });
  }
}

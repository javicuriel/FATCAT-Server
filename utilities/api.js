var https = require('https');
var credentials = require('../config/database').credentials;
var cloud = require('../config/cloud');
var database = require('../config/database');
var moment = require('moment');


function calculate_analysis(deviceId, timestamp, callback){
  // Get timestamps needed for analysis
  t1 = moment(timestamp).utc();
  t0 = moment(timestamp).utc().subtract(5, 'seconds');
  t2 = moment(timestamp).utc().add(630, 'seconds');
  // Get all Databases in case analysis points are in more than one database;
  db_names = get_database_names_from_dates(t0,t2);
  // Query all points between t0 and t2
  query = getQuery(t0.toISOString(), t2.toISOString(), deviceId, 'reading');
  // Get all docs from multiple databases
  get_docs_multiple_databases(db_names, query, (error, docs) => {
    if(error) return callback(error, null);
    // Format data for cloud function
    data = {timestamp: timestamp, rows: docs};
    analyse_data(data, (error,results) => {
      if(error) return callback(error, null);
      callback(null, results);
    });
  });
}


function get_database_names_from_dates(start, end) {
    var base = 'iotp_'+cloud.config.org+'_default_';
    // var base = 'iotp_brd98r_default_';

    var dateArray = [];
    var currentDate = moment(start).utc();
    var endDate = moment(end).utc();

    while (currentDate <= endDate) {
      dateArray.push(base + moment(currentDate).format('YYYY-MM-DD'));
      currentDate = moment(currentDate).add(1, 'days');
    }
    return dateArray;
}

function get_docs_multiple_databases(db_names, query, callback){
  total_rows = db_names.length;
  docs = [];
  db_names.forEach( db_name => {
    db = database.get(db_name);
    db.find(query, function(err, result){
      if(err) return callback(err, null);

      result.docs.forEach( datum => {
        docs.push(datum.data)
      });

      --total_rows;
      if(total_rows <= 0){
        callback(null, docs);
      }
    });
  });
}

function analyse_data(data, callback){
  query = JSON.stringify(data);
  cf_api = JSON.parse(process.env['cloud_functions']);
  if(process.env['cloud_functions']){
    var options = {
      hostname: cf_api.host,
      port: 443,
      path: cf_api.path,
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': query.length,
          'Authorization': 'Basic ' + new Buffer(cf_api.key).toString('base64')
        }
      };
      postBody(options, query, function(error, response){
        if(error) return callback(error, null);
        callback(null, response.response.result);
      });
  }
  else{
    callback("Not Authorization", null);
  }
}

// Gets analysis start time considering analysis could be between two dates (different database)
function get_analysis_start_time(deviceId, analysis_event, callback){
  // var db_name = 'iotp_brd98r_default_'+ moment(analysis_event.timestamp).utc().subtract(analysis_event.retry,'days').format('YYYY-MM-DD');
  var db_name = 'iotp_'+cloud.config.org+'_default_'+ moment(analysis_event.timestamp).utc().subtract(analysis_event.retry,'days').format('YYYY-MM-DD');

  analysis_event.retry += 1;
  if(analysis_event.retry > 2) return callback("Maximun retries!", null);

  var db = database.get(db_name);
  // Select first element not equal to 0
  query = {
    "selector": {
      "eventType": "reading",
      "deviceId": deviceId,
      "data": {
        "timestamp": { "$lt": analysis_event.timestamp},
        "countdown": { "$ne": 0 }
      }
    },
    "fields": ["data"],
    "sort": [{"data.timestamp": "desc"}],
    "limit": 1
  };
  if(analysis_event.retry > 1) {
    query['selector']['data']['timestamp']['$lt'] = moment(analysis_event.timestamp).subtract(analysis_event.retry - 1,'days').endOf('day').utc().format();
  }
  // Create a search index before querying the database
  create_search_index(db, (error,response) =>{
    // Look for first element not equal to 0, if successfull, look for the start of the analysis, else look in database of the day before
    db.find(query, function(error, result_1) {
      if(error) return callback(error, null);
      if(!result_1.docs || result_1.docs.length == 0) return get_analysis_start_time(deviceId, analysis_event, callback);
      // Select first element equal to 0 to get the moment the analysis starts
      query.selector.data = {
        "timestamp": { "$lte": result_1.docs[0].data.timestamp},
        "countdown": { "$eq": 0 }
      };
      db.find(query, function(error, result_2) {
        if(error) return callback(error, null);
        if(!result_2.docs || result_2.docs.length == 0) {
          date = moment(analysis_event.timestamp).utc().subtract(1,'days').endOf('day');
          db = database.get('iotp_'+cloud.config.org+'_default_'+ date.format('YYYY-MM-DD'));
          db.find(query, function(error, result_2) {
            if(error) return callback(error, null);
            if(!result_2.docs || result_2.docs.length == 0) return callback("No document found", null);
            return callback(null, result_2.docs[0].data.timestamp);
          });
        }
        // Return the timestamp
        callback(null, result_2.docs[0].data.timestamp);
      });
    });
  });
}

function getQuery(startDate = null, endDate = null, deviceId = null, eventType = null, eventId = null){
  var query = {
    selector: {}
  };
  if(startDate){
    if(eventType == 'reading'){
      query.selector['data'] = {timestamp: {$gte: startDate, $lte: endDate}}
    }
    else{
      query.selector['timestamp'] = {$gte: startDate, $lte: endDate}
    }
  }
  if(eventId){
    query.selector['_id'] = eventId;
  }
  if(deviceId){
    query.selector['deviceId'] = deviceId;
  }
  if(eventType){
    query.selector['eventType'] = eventType;
  }
  return query;
}


function findJob(db, deviceId, jobId, callback){
  var query = {
    selector: {
      deviceId: deviceId,
      job:{
        jobId: jobId
      }
    }
  };

  db.find(query, function(err, response){
    if(err){
      callback(err, err.statusCode);
    }
    else{
      if(response.docs.length == 0){
        callback(err, null);
      }
      else{
        callback(err, response.docs[0]);
      }
    }
  });
}

function postBody(options, query, callback){
  var body = new Buffer(0);
  var req = https.request(options, (res) => {
    res.on('data', (chunk) => {
      body = Buffer.concat( [ body, chunk ] );
    });
    res.on('end', () => {
      callback(null, JSON.parse(body));
    });
  });
  req.on('error', (e) => {
    callback(e, null);
  });
  req.write(query);
  req.end();
}

function getBody(route, callback){
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

function create_search_index(db, callback){
  // Adds search index for timestamp of events
  var search_index = {index: {fields: ['data.timestamp']},name: 'timestamp-index',type: 'json'}
  db.index(search_index, function(er, response) {
    if (er) callback(er, null);
    callback(null, response);
  });
}


module.exports = {
  findJob,
  postBody,
  getBody,
  getQuery,
  get_docs_multiple_databases,
  get_database_names_from_dates,
  analyse_data,
  calculate_analysis,
  get_analysis_start_time
}

//  GET POINT FROM ONE DATABASE (WRONG)
// var db_name = 'iotp_'+cloud.config.org+'_default_'+ moment().format('YYYY-MM-DD');
// db_name = 'iotp_brd98r_default_2018-07-22';
// deviceId = '11'
// var db = database.get(db_name);
// query = {
//   "selector": {
//     "eventType": "reading",
//     "deviceId": deviceId,
//     "data": {
//       "countdown": { "$ne": 0 }
//     }
//   },
//   "fields": ["data"],
//   "sort": [{"data.timestamp": "desc"}],
//   "limit": 1
// };
//
// db.find(query, function(err_1, result_1) {
//   if(err_1 || !result_1.docs){
//     return res.send("Error");
//   }
//
//   query['selector']['data'] = {
//     "timestamp": { "$lte": result_1.docs[0].data.timestamp},
//     "countdown": { "$eq": 0 }
//   };
//   db.find(query, function(err_2, result_2) {
//     if(err_2){
//       return res.send("Error");
//     }
//     // res.send(result_2);
//     get_analysis_data_points(result_2.docs[0].data.timestamp, (error,results) => {
//       res.send(results);
//     });
//   });
// });

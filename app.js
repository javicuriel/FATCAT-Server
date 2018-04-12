var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var ibmiot = require("ibmiotf");
var https = require('https');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var controlRouter = require('./routes/control');
var historicRouter = require('./routes/historic');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var status_users = 0;
var instruments = {};

var cloud_orgID = "kbld7d";
var cloud_domain = "internetofthings.ibmcloud.com";
var auth_key = process.env.IBM_AUTH_KEY;
var auth_token = process.env.IBM_AUTH_TOKEN;
var app_id = "nodejs-app";

// MQTT Client IBM package
var appClientConfig = {
    "org" : cloud_orgID,
    "domain": cloud_domain,
    "id" : app_id,
    "auth-key" : auth_key,
    "auth-token" : auth_token
};
var iotClient = new ibmiot.IotfApplication(appClientConfig);
// iotClient.log.setLevel('debug');
// iotClient.connect();

//Basic HTTP options for Internet of Things Foundation IBM API
var api = {
  port: 443,
  rejectUnauthorized: false,
  hostname: `${cloud_orgID}.${cloud_domain}`,
  auth: auth_key + ':' + auth_token,
  base_path: '/api/v0002/'
};

api.path = api.base_path + `bulk/devices/?typeId=instrument`;
https.get(api, function(http_res) {
  var data = [];
  if (http_res.statusCode == 200){
    http_res.on('data', function(chunk) {
      data.push(chunk);
    });
    http_res.on('end',function(){
      JSON.parse(data).results.forEach(function(instrument){
        instruments[instrument.deviceId] = {users: 0, connection: null};
      });
      iotClient.connect();
    });
  }
  else{
    console.log("Error" + http_res.statusCode);
  }
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(function(req, res, next){
  res.io = io;
  res.iotClient = iotClient;
  res.api = api;
  res.instruments = instruments;
  if (!iotClient.isConnected) {
    next(createError(503));
  }
  else{
    next();
  }
});




app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Bower front-end
app.use(express.static(__dirname+ '/bower_components'));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/control', controlRouter);
app.use('/historic', historicRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.log(err.status);
  // res.redirect('back');
  res.render('error');
});


var add_request_device_data = function (id) {
  instruments[id].users += 1;
  if(instruments[id].users == 1){
    iotClient.subscribeToDeviceEvents("instrument",id,"+","json");
  }
};

var delete_request_device_data = function (id) {
  instruments[id].users -= 1;
  if (instruments[id].users == 0){
    iotClient.unsubscribeToDeviceEvents("instrument",id,"+","json");
  }
};

var connect_socket = function(socket, room){
  // One socket can only be connected to one room therefore
  // Disconnect from previous connections
  disconnect_socket(socket);
  socket.room = room;
  socket.join(room);
  add_request_device_data(room);
}

var disconnect_socket = function(socket){
  if(socket.room){
    delete_request_device_data(socket.room);
    socket.leave(socket.room);
    socket.room = null;
  }
}

var validate_room = function(room, success_callback) {
  if (room in instruments){
    success_callback();
  }
  else{
    api.path = api.base_path + 'device/types/instrument/devices/' + room;
    var http_req = https.get(api, function(http_res) {
      if (http_res.statusCode == 200){
        instruments[room] = {users: 0, connection: null};
        success_callback();
      }
    });
  }
}
var reload_io = io.of('/reload');
var control_io = io.of('/control');
control_io.on('connection', function(socket){
  socket.on('recieve', function (room) {
    validate_room(room, function(){
      connect_socket(socket, room);
    });
  });
  socket.on('command', function (data) {
    if(socket.room){
      iotClient.publishDeviceCommand("instrument", socket.room, data[0], "txt", data[1]);
    }
  });
  socket.on('disconnect', function () {
    disconnect_socket(socket);
  });
});

var status_io = io.of('/status');

status_io.on('connection', function(socket){
  socket.on('recieve', function (room) {
    socket.room = room;
    socket.join(room);
    if (room == 'all'){
      status_io.to('all').emit('status_set', instruments);
    }
  });
  socket.on('disconnect', function(room){
    socket.leave(room);
    socket.room = null;
  });

});

iotClient.on("connect", function () {
  console.log("IOT connected");
  iotClient.subscribeToDeviceStatus("instrument");
  reload_io.emit('reload');
});

iotClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload) {
  control_io.to(deviceId).emit('data', JSON.parse(payload.toString()));
});

iotClient.on("deviceStatus", function (deviceType, deviceId, payload, topic) {
  instrument = JSON.parse(payload);

  if(!(deviceId in instruments)){
    instruments[deviceId] = {users: 0, connection: instrument.Action};
  }
  else{
    instruments[deviceId].connection = instrument.Action;
  }
  data = {id:deviceId, connection:instrument.Action}

  status_io.to(deviceId).emit('status_update', data);
  status_io.to('all').emit('status_update', data);
});

// OLD
// module.exports = app;
// Exporting the app and also the IO server
module.exports = {app: app, server: server};

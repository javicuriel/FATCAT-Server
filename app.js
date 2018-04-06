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

var connections = {}

var cloud_orgID = "kbld7d";
var cloud_domain = "internetofthings.ibmcloud.com";
var auth_key = process.env.IBM_AUTH_KEY;
var auth_token = process.env.IBM_AUTH_TOKEN;
var app_id = "nodejs-app";

var appClientConfig = {
    "org" : cloud_orgID,
    "domain": cloud_domain,
    "id" : app_id,
    "auth-key" : auth_key,
    "auth-token" : auth_token
};
var iotClient = new ibmiot.IotfApplication(appClientConfig);

//Basic HTTP options for Internet of Things Foundation
var api = {
  port: 443,
  rejectUnauthorized: false,
  hostname: `${cloud_orgID}.${cloud_domain}`,
  auth: auth_key + ':' + auth_token,
  base_path: '/api/v0002/'
};


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(function(req, res, next){
  res.io = io;
  res.iotClient = iotClient;
  res.connections = connections;
  res.api = api;
  next();
});

iotClient.on("connect", function () {
  console.log("IOT connected");
  // iotClient.subscribeToDeviceEvents("instrument");
  // Not working
  // iotClient.subscribeToDeviceStatus("instrument");
});

iotClient.connect();



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
  res.render('error');
});


var add_request_device_data = function (id) {
  if (id in connections){
    connections[id] += 1;
  }
  else{
    connections[id] = 1;
    iotClient.subscribeToDeviceEvents("instrument",id,"+","json");
  }
};

var delete_request_device_data = function (id) {
  connections[id] -= 1;
  if (connections[id] == 0){
    iotClient.unsubscribeToDeviceEvents("instrument",id,"+","json");
  }
};

var disconnect_socket = function(socket){
  if(socket.room){
    delete_request_device_data(socket.room);
    socket.leave(socket.room);
    socket.room = null;
  }
}

var control_id_io = io.of('/control_id');
control_id_io.on('connection', function(socket){
  socket.on('recieve', function (room) {
    disconnect_socket(socket);
    api.path = api.base_path + `device/types/instrument/devices/${room}`;
    var http_req = https.get(api, function(http_res) {
      if (http_res.statusCode == 200){
        socket.room = room;
        socket.join(room);
        add_request_device_data(room);
      }
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

iotClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload) {
  console.log("mensaje");
  control_id_io.to(deviceId).emit('data', JSON.parse(payload.toString()));
});


// OLD
// module.exports = app;
// Exporting the app and also the IO server
module.exports = {app: app, server: server};

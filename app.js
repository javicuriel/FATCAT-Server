var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var ibmiot = require("ibmiotf");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var controlRouter = require('./routes/control');
var historicRouter = require('./routes/historic');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var connections = {}

var appClientConfig = {
    "org" : "kbld7d",
    "domain": "internetofthings.ibmcloud.com",
    "id" : "nodejs-app",
    "auth-key" : process.env.IBM_AUTH_KEY,
    "auth-token" : process.env.IBM_AUTH_TOKEN
};
var iotClient = new ibmiot.IotfApplication(appClientConfig);

var get_device_data = function (id) {
  if (id in connections){
    connections[id] += 1;
  }
  else{
    connections[id] = 1;
  }
};

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(function(req, res, next){
  res.io = io;
  res.iotClient = iotClient;
  res.connections = connections;
  res.get_device_data = get_device_data;
  next();
});

iotClient.on("connect", function () {
  console.log("IOT connected");
  iotClient.subscribeToDeviceEvents("instrument");
  // Not working
  // iotClient.subscribeToDeviceStatus("instrument");
});

iotClient.connect();

iotClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload) {
  io.emit(deviceId, JSON.parse(payload.toString()));
  console.log(JSON.parse(payload.toString()))
  // console.log("Device Event from :: "+deviceType+" : "+deviceId+" of event "+eventType+" with payload : "+payload);
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
  res.render('error');
});


// io.on('connection', (socket) => {
//    iotClient.subscribeToDeviceEvents("instrument");
// });

// io.on('get_device_data', (id) => {
//     console.log(id);
// });

// io.on('connection', function(socket){
//   console.log('a user connected');
//   socket.on('disconnect', function(){
//     console.log('user disconnected');
//   });
// });

// OLD
// module.exports = app;
// Exporting the app and also the IO server
module.exports = {app: app, server: server};

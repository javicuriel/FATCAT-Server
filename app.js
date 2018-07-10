var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var session = require('./config/session');
var ibmiot = require("ibmiotf");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var controlRouter = require('./routes/control');
var historicRouter = require('./routes/historic');
var instrumentsApi = require('./routes/instruments');
var jobsApi = require('./routes/jobs');

var app = express();
var server = require('http').Server(app);
var socket_io = require('socket.io')(server);

var passport = require('passport');
var auth = require('./config/auth');
var flash = require('connect-flash');


var passportSocketIo = require('passport.socketio');

var cloud_settings = require('./config/cloud');
var api = cloud_settings.api;


var pubsub = new ibmiot.IotfApplication(cloud_settings.config);
var instruments = require('./config/instruments');
var sockets = require('./config/sockets')(socket_io, instruments, pubsub);
pubsub = require('./config/pubsub')(pubsub, sockets, instruments);


// Get all instruments and connect pubsub
instruments.init(pubsub);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Bower front-end
app.use(express.static(__dirname+ '/bower_components'));

// Static assests called before session so there is no multiple database calls
app.use(session.session(session.config));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

require('./config/passport')(passport);

socket_io.use(passportSocketIo.authorize({
  key: 'connect.sid',
  secret: session.config.secret,
  store: session.config.store,
  passport: passport,
  cookieParser: cookieParser
}));

app.use(function(req, res, next){
  req.pubsub = pubsub;
  req.instruments = instruments;
  // next();
  if (pubsub.isConnected) {
    next();
  }
  else{
    next(createError(503));
  }
});

app.use('/', usersRouter);
app.use('/control', auth.isAuthenticated, controlRouter);
app.use('/historic', auth.isAuthenticated, historicRouter);
app.use('/instruments', auth.isAuthenticated, instrumentsApi);
app.use('/jobs', auth.isAuthenticated, jobsApi);

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

// Exporting the app and also the IO server
module.exports = {app: app, server: server};

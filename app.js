var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var session = require('./config/session');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var controlRouter = require('./routes/control');
var historicRouter = require('./routes/historic');

var app = express();
var server = require('http').Server(app);
var socket_io = require('socket.io')(server);

var passport = require('passport');
var auth = require('./config/auth');
require('./config/passport')(passport);

var passportSocketIo = require('passport.socketio');

var cloud_settings = require('./config/cloud');
var api = cloud_settings.api;

var instruments = require('./config/instruments');
var pubsub = require('./config/pubsub')(socket_io, instruments);


// Get all instruments and connect pubsub
instruments.init(pubsub);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Bower front-end
app.use(express.static(__dirname+ '/bower_components'));


if (app.get('env') === 'production') {
  session.config.cookie.secure = true // serve secure cookies
}

// Static assests called before session so there is no multiple database calls
app.use(session.session(session.config));
app.use(passport.initialize());
app.use(passport.session());


socket_io.use(passportSocketIo.authorize({
  key: 'connect.sid',
  secret: session.config.secret,
  store: session.config.store,
  passport: passport,
  cookieParser: cookieParser
}));

app.use(function(req, res, next){
  // console.log(req.session);
  res.api = api;
  res.instruments = instruments;
  if (pubsub.isConnected) {
    next();
  }
  else{
    next(createError(503));
  }
});


// app.use('/', indexRouter);
app.use('/', usersRouter);
app.use('/control', auth.isAuthenticated, controlRouter);
app.use('/historic', auth.isAuthenticated, historicRouter);


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

// OLD
// module.exports = app;
// Exporting the app and also the IO server
module.exports = {app: app, server: server};

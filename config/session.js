var session = require("express-session");
var CloudantStore = require('connect-cloudant-store')(session);
var database = require('./database');
var store = new CloudantStore(database.credentials);

var config = {
  store: store,
  secret: '56950fe494af8e88204adf6d',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false
  }
}

module.exports = {session, config};

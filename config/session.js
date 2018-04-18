var session = require("express-session");
var CloudantStore = require('connect-cloudant-store')(session);
var store = new CloudantStore(require('../dbcredentials'));

store.on('connect', function() {
     // Cloudant Session store is ready for use
});

store.on('disconnect', function() {
    // failed to connect to cloudant db - by default falls back to MemoryStore
});

store.on('error', function(err) {
  // console.log(err);
  // You can log the store errors to your app log
});

var config = {
  store: store,
  secret: '56950fe494af8e88204adf6d',
  resave: false,
  saveUninitialized: true
}

module.exports = {session, config};

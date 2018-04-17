var encryption = require('../utilities/cripto');
var credentials = require('../dbcredentials');

// Load the Cloudant library.
var Cloudant = require('@cloudant/cloudant');

var cloudant = Cloudant(credentials);

var db = cloudant.db.use('instruments_users')

class User {

  constructor(username, salt, hashPass, id = null) {
    if(id){
      this.id = id;
    }
    this.username = username;
    this.salt = salt;
    this.hashPass = hashPass;
  }

  set_id(id){
    this.id = id;
  }

  authenticate(password){
    if (encryption.generateHashedPassword(this.salt, password) === this.hashPass) {
      return true;
    }
    else {
      return false;
    }
  }
}

var find = function(info, callback){
  var query = {
    selector: info
  };
  db.find(query, function(err, data) {
    if(err){
      callback(err, null);
    }
    else if (data.bookmark == 'nil') {
      callback(null, null);
    }
    else{
      user = new User(data.username, data.salt, data.hashPass, data._id);
      callback(null, user);
    }
  });

}


module.exports = {
  findOne: find,
  createUser: function (user, callback) {
    find({username: user.username}, (err, found_user)=>{
      if(err){
        callback(err, null);
      }
      else if (!found_user) {
        salt = encryption.generateSalt();
        hashPass = encryption.generateHashedPassword(salt, user.password);
        new_user = new User(user.username, salt, hashPass);
        db.insert(new_user, function(err, body, header) {
          if (err) {
            callback(err, null);
          }
          else{
            new_user._id = body.id;
            callback(null, new_user);
          }
        });
      }
      else{
        callback("Username already exists", null);
      }
    });
  },
  updateUser: function (query, user, callback) {
    // db.insert({ crazy: true }, '{id}' ,function(err, body, header)
    // save to database
    // callback = function (err, user);
  },

}

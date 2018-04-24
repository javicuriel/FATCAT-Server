// User model and controller
var encryption = require('../utilities/cripto');
var credentials = require('../dbcredentials');

// Load the Cloudant library.
var Cloudant = require('@cloudant/cloudant');

var cloudant = Cloudant(credentials);

var db = cloudant.db.use('instruments_users')

class User {

  constructor(username, salt, hashPass, admin, id = null) {
    if(id){
      this.id = id;
    }
    this.username = username;
    this.salt = salt;
    this.hashPass = hashPass;
    this.admin = admin;
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
      user = new User(data.docs[0].username, data.docs[0].salt, data.docs[0].hashPass, data.docs[0].admin ,data.docs[0]._id);
      return callback(null, user);
    }
  });

}


module.exports = {
  findOne: find,
  createUser: function (user, callback) {
    if(user.password != user.confirmPassword){
      return callback(null, null);
    }
    find({username: user.username}, (err, found_user)=>{
      if(err){
        callback(err, null);
      }
      else if (!found_user) {
        salt = encryption.generateSalt();
        hashPass = encryption.generateHashedPassword(salt, user.password);
        admin = false;
        if(user.admin){
          admin = true;
        }
        new_user = new User(user.username, salt, hashPass, admin);
        db.insert(new_user, function(err, body, header) {
          if (err) {
            callback(err, null);
          }
          else{
            new_user.set_id(body.id)
            callback(null, new_user);
          }
        });
      }
      else{
        return callback(null, null);
      }
    });
  },
  updateUser: function (query, user, callback) {
    // db.insert({ crazy: true }, '{id}' ,function(err, body, header)
    // save to database
    // callback = function (err, user);
  },

}

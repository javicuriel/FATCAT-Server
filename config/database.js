function getDBCredentialsUrl(jsonData) {
    var vcapServices = JSON.parse(jsonData);
    // Pattern match to find the first instance of a Cloudant service in
    // VCAP_SERVICES. If you know your service key, you can access the
    // service credentials directly by using the vcapServices object.
    for (var vcapService in vcapServices) {
        if (vcapService.match(/cloudant/i)) {
            return vcapServices[vcapService][0].credentials;
        }
    }
}

credentials = {};

if (process.env.VCAP_SERVICES) {
  credentials = getDBCredentialsUrl(process.env.VCAP_SERVICES);
}
else{
  credentials = require('../dbcredentials');
}

// Load the Cloudant library.
var Cloudant = require('@cloudant/cloudant');

var cloudant = Cloudant(credentials);

var db = cloudant.db.use('carbonmeasurementapp_users');

module.exports = {
  credentials,
  db
}

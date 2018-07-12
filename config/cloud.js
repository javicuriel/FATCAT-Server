// Sets up IOT server configuration from vcapServices or enviroment
if (process.env.VCAP_SERVICES) {
  var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
  var config = vcapServices['iotf-service'][0].credentials;
}
else {
  var config = {
      "org" : "kbld7d",
      "domain": "internetofthings.ibmcloud.com",
      "http_host": "kbld7d.internetofthings.ibmcloud.com",
      "apiKey" : process.env.IBM_AUTH_KEY,
      "apiToken" : process.env.IBM_AUTH_TOKEN
  };
}
config['id'] = "nodejs-app";
config['auth-key'] = config.apiKey;
config['auth-token'] = config.apiToken;
config['clean-session'] = false;

var api = {
  port: 443,
  rejectUnauthorized: false,
  hostname: config.http_host,
  auth: config.apiKey + ':' + config.apiToken,
  base_path: '/api/v0002/'
}

module.exports = {config: config, api: api};

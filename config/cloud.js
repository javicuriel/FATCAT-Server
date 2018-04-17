var config = {
    "org" : "kbld7d",
    "domain": "internetofthings.ibmcloud.com",
    "id" : "nodejs-app",
    "auth-key" : process.env.IBM_AUTH_KEY,
    "auth-token" : process.env.IBM_AUTH_TOKEN
};

var api = {
  port: 443,
  rejectUnauthorized: false,
  hostname: config.org+'.'+config.domain,
  auth: config['auth-key'] + ':' + config['auth-token'],
  base_path: '/api/v0002/'
}

module.exports = {config: config, api: api};

const express = require("express");
const httpProxy = require("http-proxy");
const { JWT } = require("google-auth-library");
const path = require("path");
const web_o = require("http-proxy/lib/http-proxy/passes/web-outgoing");

///////////////////////////////////////////////////////
//
// Read config files.
//
///////////////////////////////////////////////////////

// This file contains keys for service account.
// Source control has an invalid file. You need to have the correct one in order to connect to cloud or to deploy.
// Connection to local host shold still work OK though.
const keysServiceAccount = require("./keys.service.account.with.iap.access.json");
// This file contains keys for backend. This is what we are trying to acess and forward requests to.
// Source control has an invalid file. You need to have the correct one in order to connect to cloud or to deploy.
// Connection to local host shold still work OK though.
const keysBackEndClient = require("./keys.backend.client.json");
// This file contains a link to backend URL. Local or remote.
const targetApiURL = require("./target.local.json");
// Read the destination client id. This is the back end's client id.
const clientId = keysBackEndClient.web.client_id;
// Create the client that can make a call to back end and authorize
const client = new JWT({
  email: keysServiceAccount.client_email,
  key: keysServiceAccount.private_key,
  additionalClaims: { target_audience: clientId }
});
// Port to use depending on environment
// PORT is set by google cloud
let port = process.env.NVV_INTERNAL_NODE_PORT || process.env.PORT || 8080;

console.log("target URL is -> " + targetApiURL.api_target_url);
console.log('eventer URL is -> ' + targetApiURL.api_eventer_url);
console.log("enviromnet is -> " + targetApiURL.environment);

///////////////////////////////////////////////////////
//
// Start things up.
//
///////////////////////////////////////////////////////

// Create express object. This is our web server.
const expressApplication = express();

// Set middleware to serve static content. Tell web server to serve static content.
expressApplication.use(express.static("dist/nvv-ui"));

// ??????
expressApplication.set("trust proxy", true);

///////////////////////////////////////////////////////
//
// Local storage. This is our token to google.
//
///////////////////////////////////////////////////////
let id_token = targetApiURL.environment == "develop" ? "hello" : null;

let inprogress = false;
let waitingCallbacks = [];

function authorize(callback) {
  if (inprogress) { // re-auth already in progress, enqueue our callback
    waitingCallbacks.push(callback);
    return;
  }
  inprogress = true;
  id_token = null;
  client.authorize()
    .then(authorizationResult => {
      id_token = authorizationResult.id_token;
      console.log("Authorized " + id_token);
      // call callbacks and cleanup
      callback();
      var callbacks = waitingCallbacks;
      waitingCallbacks = [];
      inprogress = false;
      for (var cb of callbacks) {
        cb();
      }
    }).catch(err => {
      // TODO some sort of back-off algorithm on auth error to prevent spamming with failed auth requests
      console.error("error");
      console.error(err);
      // call callbacks and cleanup
      callback();
      var callbacks = waitingCallbacks;
      waitingCallbacks = [];
      inprogress = false;
      for (var cb of callbacks) {
        cb();
      }
    });
}

function onProxyReq(proxyReq, req, res) { // add auth header
  proxyReq.setHeader('Authorization', 'Bearer ' + id_token);
}

function onProxyRes(proxyRes, req, res) {
  if (proxyRes.statusCode !== 401) { // the proxied call worked
    if (!res.headersSent) {
      for (let fun in web_o) {
        web_o[fun](req, res, proxyRes, this.options);
      }
    }
    proxyRes.pipe(res);
  } else { // the auth token was rejected
    let self = this;
    authorize(function () {
      if (id_token !== null) {
        // re-auth successful. retry proxying
        self.web(req, res);
      } else { // re-authorization has failed
        res.sendStatus(500); // TODO
      }
    });
  }
}

function onProxyError(err, req, res) { // TODO
  console.log('Error!!!', err.reason);
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });
  res.end(
    'Something went wrong. And we are reporting a custom error message.'
  );
}

let proxyApi = httpProxy.createProxyServer({
  target: targetApiURL.api_target_url,
  changeOrigin: true,
  selfHandleResponse: true
});

proxyApi.on("proxyReq", onProxyReq);
proxyApi.on("proxyRes", onProxyRes);
proxyApi.on("error", onProxyError);

let proxyEventerApi = httpProxy.createProxyServer({
  target: targetApiURL.api_eventer_url,
  changeOrigin: true,
  selfHandleResponse: true
});

proxyEventerApi.on('proxyReq', onProxyReq);
proxyEventerApi.on('proxyRes', onProxyRes);
proxyEventerApi.on('error', onProxyError);

// Redirect / to our html file
expressApplication.all("/api/*", (req, res) => {
  if (id_token == null) {
    authorize(function () {
      if (id_token !== null) {
        // re-auth successful. retry proxying
        proxyApi.web(req, res);
      } else {
        // re-authorization has failed
        res.sendStatus(500); // TODO
      }
    });
  } else {
    proxyApi.web(req, res);
  }
});

expressApplication.all('/eventer/api/*', (req, res) =>{
  // re-write the url
  req.url = req.url.replace(/^\/eventer\/api/g, '/api');
  if(id_token==null){
      authorize(function(){
          if(id_token!==null) {
              // re-auth successful. retry proxying
              proxyEventerApi.web(req, res);
          }else{ // re-authorization has failed
              res.sendStatus(500); // TODO
          }
      });
  }else {
    proxyEventerApi.web(req, res);
  }
});

// Redirect / to our html file
expressApplication.get("*", (req, res) =>
  res.sendFile(path.resolve("dist/nvv-ui/index.html"))
);

// Start the server
console.log("running on port " + port);
const server = expressApplication.listen(port);
console.log("listening started");

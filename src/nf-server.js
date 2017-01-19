/**
* @license:
* MIT (c) 2016 Gordon m. Finnie III */

/** nf-server:
*
* Serve the node force RESTful API.
* Provide routes for:
*  Authentication
*  POST to salesforce
*  GET from salesforce
*/

/* Import Custom Middleware */
var auth       = require("./nf-auth.js");
var translator = require("./nf-translator.js");
var force      = require("./nf-force.js");
var parser  = require("./nf-parser.js");

/* Import Third Party Middleware */
var express     = require('express');
var bodyParser  = require('body-parser');
var http        = require('http');

/* Express Server */
var app = express();

/* Multer Declaration */
var multer = require('multer');
var upload = multer();

/* Express Router */
var apiRoutes = express.Router();

/* Logger */
var logger = require("./log/logger");

/* Morgan */
app.use(require('morgan')({ "stream": logger.stream }));

/**
*
* === Routes ===   */

// authenticate by providing token if provided credentials are valid
apiRoutes.post('/authenticate', auth.authorize);

// post data to salesforce by validating the request and then proessing the post
apiRoutes.post('/portal', [auth.validate, parser.processPost]);

// get data from salesforce by validating the request and then processing the get
apiRoutes.get('/portal', [auth.validate, parser.processGet]);

/* Assign Express Middleware */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use('/', express.static(__dirname + '/'));
app.use('/', apiRoutes);

// Start the server
var port = process.env.PORT || 3001;
app.listen(port);

logger.info("====N-FORCE--[ Launch ] happily serving at http//:localhost:" + port);

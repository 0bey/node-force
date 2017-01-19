/*

op-auth:
    Provide authentication functions for O.P.

*/

var mongoose    = require('mongoose');
var passport    = require('passport');
var jwt         = require('jwt-simple');
var path        = require('path');

var config      = require('./database'); // get db config File
var User        = require('./user'); // get the mongoose models

mongoose.connect(config.database);
require('./passport')(passport);

module.exports = {

  authorize: function(req, res) {
    console.log("Authentication Request: " + JSON.stringify(req.body));

    // Initialize passport
    passport.initialize();

    // Look-up user
    User.findOne({

      email: req.body.user

    }, function(err, user){

      // Failure: Error
      if (err) throw err;

      // Failure: No user w/ that name
      if (!user) {

        res.json({success: false, msg: "We couldn't find a user with that name!"});

      }
      else {

        // ... check password
        user.comparePin(req.body.pin, function (err, isMatch) {
          if (isMatch && !err) {

            // Success!
            // ... create a Token
            var token = jwt.encode(user, config.secret);
            console.log('[ Auth ]-> ' + JSON.stringify(user));

            // ... send reply
            res.json({success: true, msg: 'Login successful!', token: 'JWT ' + token});

          }
          else {

            // Failure: wrong password or error
            // ... send reply
            res.json({success: false, msg: 'Please re-enter your PIN number'});

          }
        });
      }
    });
  },

  validate: function(req, res, next){
    console.log('[AUTH] validating request w/ headers : ' + JSON.stringify(req.headers));
    // Initialize passport
    passport.initialize();
    passport.authenticate('jwt', {session:false});

    // Validate request token
    var headers = req.headers;
    var token = null;
    if (headers && headers.authorization) {

      var parted = headers.authorization.split(' ');

      if (parted.length === 2) {

        token = parted[1];

      }

    }

    if( token ) {

      // Decode token
      var decoded = jwt.decode(token, config.secret);

      // Look-up user in DB
      User.findOne({

        name: decoded.user

      }, function(err, user) {

        if( err ){

          // Error - Look-up failed
          res.json({success: false, msg: "error"});
          throw err;

        }
        if( !user ){

          // Error - No user
          console.log("[AUTH]-> Get Request Refused, NO USER FOUND");
          return res.status(403).send({success: false, msg: "We couldn't find a user with that name!"});

        }else{

          // Success - Pass to next Middleware
          console.log('[AUTH]-> Request Token Validated ');
          req.headers.accountId = user.accountId;
          req.headers.siteIds = user.siteId;
          console.log('[AUTH]-> Modified Request Headers to : ' + JSON.stringify(req.headers));
          next();

        }

      });

    }else{

      // Error - No Token Provided
      console.log('[AUTH]-> Request Denied: No Token');
      res.status(403).send({success: false, msg: "require token"});

    }

  }

}

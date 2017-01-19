/**
* @license:
* MIT (c) 2016 Gordon m. Finnie III */

/**
* Configure passportJS to be used in nf-auth middleware
*/

// auth strategy via passport-jwt tokens
var JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt  = require('passport-jwt').ExtractJwt;

// user model via user.js
var User = require('./user');

// database via database.js */
var config = require('./database'); // get db config file

/**
* Combine to form our passport authentication module
*/
module.exports = function(passport) {
  var opts         = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeader();
  opts.secretOrKey = config.secret;
  passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
    User.findOne({id: jwt_payload.id}, function(err, user) {
      if (err) {
        return done(err, false);
      }
      if (user) {
        done(null, user);
      }
      else {
        done(null, false);
      }
    });
  }));
};

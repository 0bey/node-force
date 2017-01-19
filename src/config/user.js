/**
* @license:
* MIT (c) 2016 Gordon m. Finnie III */

/**
* Schematize your mongoDB user records here. */
var mongoose    = require('mongoose');
var Schema      = mongoose.Schema;
var bcrypt      = require('bcryptjs');

/**
* The user schema object */
var UserSchema = new Schema({
  email: {
    type: String,
    unique: true,
    required: true
  },
  pin: {
    type: String,
    unique: true,
    required: true
  },
  accountId: {
    type: String,
    required: true,
    unique: true
  },
  siteId: [{
    type: String,
    required: false,
    unique: true
  }],
  created_at: Date,
  updated_at: Date
});

/**
* Configure saving a user record.
*/
UserSchema.pre('save', function (next) {

  var user = this;

  // get current date
  var currentDate = new Date();

  // change the updated_at field to current Date
  this.updated_at = currentDate;

  // if created_at doesn't exist, add to that field
  if (!this.created_at) {
    this.created_at = currentDate
  };

  // next();

  // Encryption if we use a PIN number or password
  if (this.isModified('pin') || this.isNew) {
    bcrypt.genSalt(10, function (err, salt) {
      if (err) {
        return next(err);
      }
      bcrypt.hash(user.pin, salt, function (err, hash) {
        if (err) {
          return next(err);
        }
        user.pin = hash;
        next();
      });
    });
  }
  else {
    return next();
  }
});

/**
* Configure compare pin function.
*/
UserSchema.methods.comparePin = function (pin_passed, cb) {
  bcrypt.compare(pin_passed, this.pin, function (err, isMatch) {
    if (err) {
      return cb(err);
    }
    cb(null, isMatch);
  });
};

/**
* Export the model.
*/
module.exports = mongoose.model('User', UserSchema);

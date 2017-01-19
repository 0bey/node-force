/**
* @license:
* MIT (c) 2016 Gordon m. Finnie III */

/* nf-parser:

    Control submission of data.

    Turns a submitted JSON object into a series of sf API calls.

*/

/* Import external modules */
var logger = require('winston');
var async = require('async');

/* Import nforce native modules */
var force = require("./nf-force.js");

var translator = require("./nf-translator.js");


/** 
*
* === Internal functions ===  */
var processContactCard = function(cardObject, callback){

  translator.translatePortalObject(cardObject, function(err, sfObjectArray){

    if(err){
      console.error(err);
      callback(err);
      return;
    }

    var contactPushOptions = {
        method: cardObject.Id ? 'update' : 'create',
        objectName: 'Contact',
        objectData: sfObjectArray[0]
    };

    force.push(contactPushOptions, function(err, contactId){

      if(err){
        console.error(err);
        callback(err);
        return;
      }

      var roleData = sfObjectArray[1];
      roleData.Contact__c = contactId;

      var rolePushOptions = {
        method: roleData.Id ? 'update' : 'create',
        objectName: 'Contact_Role__c',
        objectData: roleData
      };

      force.push(rolePushOptions, function(err, roleId){

        if(err){
          console.error(err);
          callback(err);
          return;
        }

        callback();

      });

    });

  });

};

var processOtherCard = function(cardObject, callback){

  translator.translatePortalObject(cardObject, function(err, sfTranslation){

    if(err){
      console.error(err);
      callback(err);
    }

    var objectPushOptions = {
      method: cardObject.Id ? 'update' : 'create',
      objectName: cardObject.attributes.type,
      objectData: sfTranslation
    };

    force.push( objectPushOptions, function(err, objectId){

      if(err){
        console.error(err);
        callback(err);
        return;
      }

      callback();

    });

  });

};

var processPortalObject = function(cardObject, callback){

  // for every sf object which card object maps to:
  // 1 translate
  // 2 push;
  console.log('\n[PARSER] Object -> ' + JSON.stringify(cardObject));

  if( cardObject.attributes.type === "Contact"){

    processContactCard(cardObject, function(err){

      if(err){
        console.error(err);
        return callback(err);
      }

      callback();

    });

  }else{

    processOtherCard(cardObject, function(err){

      if(err){
        console.error(err);
        return callback(err);
      }

      callback();

    });

  }

};

var processObjectArray = function(value, key, callback){

  console.log('\n[PARSER] Processing Array Key= ' + key + ' Value= ' + JSON.stringify(value));

  // Process an array of objects
  async.each(value, processPortalObject, function(err){

    if(err){

      // Error in processing array objects
      console.error('[PARSER]-> processObjectArray ERROR ' + JSON.stringify(err));
      return callback(err);

    }

    // Successful processing of array objects
    console.log('[PARSER]-> processObjectArray Success');
    return callback();

  });
};

module.exports = {

  processGet: function(req,res){

    force.pull(req,res);

  },

  /** Process a POST request.
  * @param{Object} req - the request to process, with data in body.
  * @param{Object} res - the result to send.
  * @return{Object} res -
  */
  processPost: function(req, res){

    console.log('[PARSER] -> Received ' + JSON.stringify(req.headers));
    console.log('[PARSER] -> Body ' + JSON.stringify(req.body));

    if( req.headers['submission-type'] === 'batch'){

      /* META: For each object in each array in JSON, translate object, then push to SF */
      async.forEachOf(req.body, processObjectArray, function(err){

        if(err){

          // Error in submission
          console.error(err.message);
          return res.json({success: false, msg: JSON.stringify(err)});

        }

        // Successful submission
        console.error('[PARSER] Successful submission.');
        return res.json({success: true, isSubmission: true, msg: 'Submitted form successfully'});

      });

    }else if( req.headers['submission-type'] === 'destroy'){

      var objectDestroyOptions = {

        method : 'destroy',
        objectName: req.body.objectName,
        objectData : req.body.objectData

      };

      force.push(objectDestroyOptions, function(err){

        if(err){
          console.error(JSON.stringify(err));
          return res.json({success: false, msg: JSON.stringify(err)});
        }

        return res.json({success: true, isSubmission: true, msg: 'Destroyed contact successfully'});

      });

    }else if( req.headers['submission-type'] === 'attachment'){

      return res.json({success: false, msg: 'Attachments not yet supported!'});

    }

  }

}

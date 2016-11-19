/**
* @license:
* MIT (c) 2016 Gordon m. Finnie III */

/* op-translator:

    Provide functions to convert data objects between salesforce and client formats.

*/

/* Logger */
var logger = require('winston');

var multer = require('multer');

translateSiteCard = function(cardData, callback){

  // No Translation necessary
  var sfTranslation = cardData;

  handleTranslation(null, sfTranslation, callback);

};

translateContactCard = function(cardData, callback){

  // Contact_Role__c
  var sfRole = JSON.parse(JSON.stringify(cardData.role));
  if(sfRole.Id){

    // Role update filters
    delete sfRole.Site__c;
    delete sfRole.Name;
    delete sfRole.Email__c;

  }
  cardData.Email_Escalation__c = "1";
  sfRole.Notify_Authorized_to_Acknowledge__c = "Authorized to acknowledge DR Event Call";

  // Contact__c
  var sfContact = cardData;
  delete cardData.role;
  delete cardData.displayName;

  // Return as array of sf objects
  var sfTranslation = [sfContact, sfRole];

  handleTranslation(null, sfTranslation, callback);

};

translateEquipmentCard = function(cardData, callback){
  var sfTranslation = cardData;

  // translations - update //
  if( cardData.Id ){

    // these fields are updatable: false
    delete cardData.Tier_Rating__c;
    delete cardData.Name;
    delete cardData.Generator_Contact__c;
    delete cardData.Startup_Type__c;

  }

  handleTranslation(null, sfTranslation, callback);
};

translateAttachment = function(attachmentData, callback){
/*
  var Options = {

    ParentId: req.headers.parentid,

    Name: req.file.originalname,

    Body: req.file.buffer.toString('base64'),

    ContentType: req.file.mimetype

  }

  req.body = newAttachment;
*/
};

handleTranslation = function(err, sfTranslation, callback){

  if(err) return callback(err);

  return callback(null, sfTranslation);

};

module.exports = {


  translatePortalObject: function(cardData, callback){
    switch(cardData.attributes.type){

      case "Contact":
        translateContactCard(cardData, callback);
        break;

      case "Site__c":
        translateSiteCard(cardData, callback);
        break;

      case "Equipment__c":
        translateEquipmentCard(cardData, callback);
        break;

      case "Attachment":
        translateAttachment(cardData, callback);
        break;

      default:
        callback('unrecognized object type' + cardData.attributes.type);

    }
  },

  translateSFObject: function(req, res){


  }

}

/**
* @license:
* MIT (c) 2016 Gordon m. Finnie III */

/* Logger */
var logger = require('winston');

// Imports
var fs = require('fs');
var jsforce = require('jsforce');
var bodyParser  = require('body-parser');

// Salesforce credentials (internal configuration)
var cred = require('./config/cred.js');
var username = cred.usernmae;
var password = cred.passwordPlus;
var url = cred.url;
var forceConfig = require('./config/fields.js')

module.exports = {

  push: function( options, pushCallBack ){

    var method = options.method;
    var objectName = options.objectName;
    var objectData = options.objectData;

    // //
    // 0. Connect to SF
    // //

    // Make connection
    var conn = new jsforce.Connection({ loginUrl : url });

    // Log in
    conn.login(username, password, function(err, userInfo){

      /* Failure! : Error */
      if (err) return {err:'Failed to log in'};

      // //
      // 1. Make SF Call based upon submission-method
      // //
      if( method == "create" ){

        // Create Object
        conn.sobject(objectName).create(objectData, function(err, ret){

          if(err){
            // Error!
            console.log( '=====================------------Create ' + objectName + ' : ERROR-------------======\n');
            console.error(err);
            console.log( '=====================================================================\n');
            return pushCallBack(err);
          }

          // Success!
          console.log( '=====================-----------------------======\n');
          console.log("[POST :: /portal]-> Created = "+ objectName + ", Id = "+ret.id);
          console.log( '=====================================================================\n');

          // Send
          pushCallBack(null, ret.id);

        });

      }else if( method == "update"){

        // Update Object
        conn.sobject(objectName).update(objectData, function(err, ret){

          if(err){

            // Error!
            console.log( '=====================------------Update ' + objectName + ' : ERROR-------------======\n');
            console.error(err);
            console.log( '=====================================================================\n');

            return pushCallBack(err);

          }

          // Success!
          console.log( '=====================----------------------======\n');
          console.log("[POST :: /portal]-> Updated = "+objectName+", Id = "+ret.id);
          console.log( '=====================================================================\n');

          // Send
          pushCallBack(null, ret.id);

        });

      }else if( method == "destroy"){

        // Destroy Object
        conn.sobject(objectName).destroy(objectData.Id, function(err, ret){

          if(err){
            // Error!
            console.log( '=====================------------Destroy ' + objectName + ' : ERROR-------------======\n');
            console.error(err);
            console.log( '=====================================================================\n');
            return pushCallBack(err);

          }

          // Success!
          console.log( '=====================-------------------------======\n');
          console.log("[POST :: /portal]-> Destroyed = "+objectName+", Id = "+ret.id);
          console.log( '=====================================================================\n');

          // Send
          pushCallBack(null, ret.id);


        });

      }else{

        // Error! - Unrecognized salesforce method
        console.log("[POST :: /portal]-> Unrecognized method " + method);
        pushCallBack('unrecognized method');


      }

    });

  },

  pull: function(req, res){


    // Get user data
    console.log('[force.pull] Received Request : ' + JSON.stringify(req.headers));
    var accountID = req.headers.accountId;   // Account
    var siteIDs = ["a031300000GKaoq", "a031300000HFF6x"];        // Sites
    var account = {                   // Form Data
          Id : accountID,
          Name: '',
          sites: [],
          roster: []
        };

    console.log( '====================------------stage 0 complete-------------======\n');
    console.log( '[GET :: /portal]-> User Account: ' + accountID );
    console.log( '[GET :: /portal]-> User Sites: ' + JSON.stringify(siteIDs) );
    console.log( '[====================================================================\n');

    /* JSFORCE */

    // //
    // I. Connect to SF
    // //

    // Make connection
    var conn = new jsforce.Connection({ loginUrl : url });

    // Log in
    conn.login(username, password, function(err, userInfo){

      /* Failure! : Error */
      if (err){
        console.error(err);
        return res.json({success: false, account: account, msg: 'Salesforce connection failed'});
      }

      /* Success! : Log properties of connection */
      console.log( '====================------------stage I complete-------------======\n');
      console.log("[GET :: /portal]-> Access Token: " + conn.accessToken);
      console.log("[GET :: /portal]-> Instance URL: " + conn.instanceUrl);
      console.log("[GET :: /portal]-> User ID: " + userInfo.id);
      console.log("[GET :: /portal]-> Org ID: " + userInfo.organizationId);
      console.log( '[====================================================================\n');

      // //
      // II. Account Details & Roster
      // //

      conn.sobject("Account")

          .select('Name')

          .include("Contacts") // including all child relationships to contacts
            .select('Id, FirstName, LastName, Title, MobilePhone, HomePhone, Email, MailingCountry, AccountId, Home_Phone_Escalation__c, Mobile_Escalation__c, SMS_Escalation__c, Email_Escalation__c')
            .end()

          .where({
            Id : accountID,
          })

          .execute(function(err,records) {

            // Error!
            if(err){
              console.log( "[GET :: /portal]-> ERROR. ");
              return res.json({success: false, msg: "error"});
            }


            // Success!
            // Set Account Name
            account.Name = records[0].Name;
            // Set Roster
            account.roster = records[0].Contacts.records;

            console.log( '================------------stage II complete-------------======\n');
            console.log( '[GET :: /portal] Account Name : ' + JSON.stringify(records[0].Name) + '\n');
            console.log( '[GET :: /portal] Child Contacts : ' + JSON.stringify(records[0].Contacts) + '\n');
            console.log( '[GET :: /portal] Account : ' + JSON.stringify(account));
            console.log( '=================================================================\n');

            // //
            // III. Site Details
            // //
            conn.sobject("Site__c")

                .select(forceConfig['Site__c'].pullList)

                .include('Site_Contact_Roles__r')
                  .select(forceConfig['Contact_Role__c'].pullList)
                  .end()

                .include('Equipment__r')
                  .select(forceConfig['Equipment__c'].pullList)
                  .end()

                .where({
                  Id : { $in : siteIDs },
                })
                .execute( function(err, records) {

                  // Error !
                  if(err){
                    console.log( "[!]-> Error Loading Sites. ");
                    console.error(err);
                    return res.json({success: false, msg: "error"});
                  }

                  // Success !
                  // Each record corresponds to a site.
                  for( var i = 0; i < records.length; i++ ){

                    console.log( ' record ' + i);
                    console.log( ' looks like ' + JSON.stringify(records[i]) );

                    // get site data
                    var siteDetails = records[i];

                    // build: site contact roles
                    var siteRoles = []; // empty
                    if( siteDetails.Site_Contact_Roles__r ){

                      siteRoles = siteDetails.Site_Contact_Roles__r.records; // filled
                      delete siteDetails.Site_Contact_Roles__r;

                    }

                    // build: equipment objects
                    var equipment = [];
                    if(siteDetails.Equipment__r){

                      equipment = siteDetails.Equipment__r.records;
                      equipment.Site__c = siteDetails.Id;

                      delete siteDetails.Equipment__r;

                    }

                    // build: site contacts by pairing contact_role__c with contact from account roster
                    var siteContacts = [];
                    for( var j = 0; j < account.roster.length; j++){

                      var rosterContact = account.roster[j];
                      rosterContact.displayName = rosterContact.FirstName + ' ' + rosterContact.LastName;
                      console.log( 'roster contact ' + j);

                      for( var k = 0; k < siteRoles.length; k++ ){
                        var rolesContact = siteRoles[k];
                        console.log( '  role ' + k);

                        if( rolesContact.Contact__c == rosterContact.Id ){
                          console.log( '   Adding to site contacts ');

                          // build: contact object - include role
                          var siteContact = JSON.parse(JSON.stringify(rosterContact));
                          siteContact['role'] = rolesContact;
                          siteContact.role['Site__c'] = siteDetails.Id;

                          // add to site contacts
                          siteContacts.push(siteContact);

                        }
                      }
                    }

                    // build: site object
                    account.sites[i] = {details: siteDetails, siteDetails: siteDetails, contacts: siteContacts, equipment: equipment};
                  }

                  // Stage Complete !
                  console.log( '================------------stage III complete-------------=====\n');
                  console.log( '[GET :: /portal]-> Records : ' + JSON.stringify(records) + '\n');
                  console.log( '[GET :: /portal]-> Sites : ' + JSON.stringify(account.sites) + '\n');
                  console.log( '[GET :: /portal]-> Account : ' + JSON.stringify(account) + '\n' );
                  console.log( '=================================================================\n');

                  res.json({success: true, account: account, msg: "Welcome! - Loading your data ... "});

                }
              ); // end III
            }
          ); // end II
        }
      ); // end I
  }
} // end exports

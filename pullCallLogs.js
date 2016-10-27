//Modules
var request = require('request');
var fs = require('fs');
var async = require('async');

//config 
var mastersid = 'ACXXXXXXX';  //master sid
var authtoken = '2aXXXXXXX';    //master token 

//dates for call logs
startDate = '2016-09-01'; 
endDate = '2016-10-01'; //put this one day past your target, ie stoping 2016-10-01 will pull logs ending at 2016-09-30 23:59:59


// shouldn't need to change.. 
const concurrency = 1;
const pageSize = 1000; //  

//accounts
var baseUrl = `https://api.twilio.com/2010-04-01/Accounts.json?PageSize=${pageSize}&Page=0`;

//main starting function - will start with master and get any sub accounts and any call logs for any sub accounts
pullSubAccounts(baseUrl, mastersid,authtoken);

function pullSubAccounts (uri, accountSid, authToken, callback) {   
    var auth = {
        user: mastersid,
        pass: authtoken
    }

    parameters = {
		url: uri,
		auth: auth,
	}

   request.get(parameters, function(error, httpResponse, body){
        //need to check for errors here, otherwise can't parse body'
        if (error) {
            console.log(error);
            console.log('retrying request... ' + uri);
            pullSubAccounts(uri, accountSid, authToken, callback);

        } else { // no error!
            async.forEachOf(JSON.parse(body).accounts, function(item,key){
                console.log("account sid = " + item.sid + " account name  = " + item.friendly_name + "account token = " + item.auth_token);
                
                //push into a queue
                q.push({sid: item.sid, auth_token: item.auth_token, friendly_name: item.friendly_name}, function () {
                    console.log("finished subaccount " + item.sid);
                });
            });
        
            if(JSON.parse(body).next_page_uri){
                pullSubAccounts('https://api.twilio.com' + JSON.parse(body).next_page_uri, accountSid, authToken, callback);
            } else {
                console.log('finsished subaccount' + accountSid);
            }
        }
    });   
}


var q = async.queue(function (subaccount, callback) {
    //when the queue is filled with an account, this function will pull call logs from the account

    var baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${subaccount.sid}/Calls.json?PageSize=${pageSize}&Page=0`;
    console.log(`Call log for + ${subaccount.friendly_name}  ${subaccount.sid} - ${startDate}  to ${endDate}.csv`);

    //Output - write to filename
    var stream = fs.createWriteStream(subaccount.friendly_name  + '_' + subaccount.sid + '-'+ startDate + ' to ' + endDate + '.csv');    
    pullCallsForAccount(subaccount.sid, subaccount.auth_token, subaccount.friendly_name, stream, baseUrl);
    callback();
},
  concurrency //
);

function pullCallsForAccount (accountSid, authtoken, friendlyname, stream, baseUrl, callback) {

    var auth = {
        user: accountSid,
        pass: authtoken
    }
    var callString = baseUrl + '&StartTime>=' + startDate + '&StartTime<=' + endDate;
    console.log(`pulling callLogs for = ${callString}`);
    pullCalls(callString, auth, stream, accountSid);
}

function pullCalls(uri, auth, accountStream,accountSid) {

	parameters = {
		url: uri,
		auth: auth,
	}
    
   request.get(parameters, function(error, httpResponse, body){
            if (error)  {
                console.log(error);
                console.log('retrying....' + uri);
                pullCalls(uri, auth, accountStream,accountSid);

            } else { //no error

                async.forEachOf(JSON.parse(body).calls, function(item,key){
                    console.log("callid = " + item.sid);
                        accountStream.write(accountSid + ',' + item.sid+ ',' + item.from +','+item.to+','+item.price + ', '+item.duration + ',' +item.direction + ','  +item.date_created + '\n');
                });

                
                if(JSON.parse(body).next_page_uri){
                    console.log("nextpage uri = " + JSON.parse(body).next_page_uri);

                    pullCalls('https://api.twilio.com' + JSON.parse(body).next_page_uri, auth, accountStream,accountSid);
                } else {
                    console.log("finished all calls for: accountSid " + accountSid);
                    accountStream.end();
                }
            } //done checking error
    });
} //end pullCalls
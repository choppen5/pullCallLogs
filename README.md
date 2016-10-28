# pullCallLogs

#install 
- git clone https://github.com/choppen5/pullCallLogs.git
- cd pullCallLogs
- npm install

# configure

Open pullCallLogs.js, edit the startDate, endDate, and mastersid and authtoken (from your Twilio console).

# run

node pullCallLogs.js 

This will produce a seperate CSV file for each subaccount, with calls for the call specified

inspiration from https://github.com/kevbotmckrier/pullMessageLogs - different version for messaging logs


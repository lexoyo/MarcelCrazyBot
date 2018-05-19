'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server

const assert = require('assert');
const request = require('request');

// Your verify token. Should be a random string.
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
assert.ok(!!VERIFY_TOKEN, 'VERIFY_TOKEN env var required');

// Generated page access token for the facebook app
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
assert.ok(!!PAGE_ACCESS_TOKEN, 'PAGE_ACCESS_TOKEN env var required');

// Facebook page ID (the page we listen for changes like comments etc)
const PAGE_ID = process.env.PAGE_ID;
assert.ok(!!PAGE_ID, 'PAGE_ID env var required');

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// verification of the webhook
app.get('/webhook', (req, res) => {
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

// call facebook api
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

function callSubscribe() {
  // Send the HTTP request to the Messenger Platform
	const url = `https://graph.facebook.com/v3.0/${ PAGE_ID }/subscribed_apps`;
	console.log('callSubscibe', url);
  request({
    "uri": url,
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "GET",
  }, (err, res, body) => {
    if (!err) {
      console.log('Page subscription sent', body)
    } else {
      console.error("Unable to send subscription:", err);
    }
  });
}
callSubscribe();

// the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
  let body = req.body;
	console.log('*****************************************');
	console.log('webhook POST', JSON.stringify(body));
	console.log('**********');

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {
			if(entry.messaging) {
				// Gets the message. entry.messaging is an array, but 
				// will only ever contain one message, so we get index 0
				let webhook_event = entry.messaging[0];

				// Get the sender PSID
				let sender_psid = webhook_event.sender.id;

				// Check if the event is a message or postback and
				// pass the event to the appropriate handler function
				if (webhook_event.message) {
					handleMessage(sender_psid, webhook_event.message);        
				} else if (webhook_event.postback) {
					handlePostback(sender_psid, webhook_event.postback);
				}
			}
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

function handlePostback(sender_psid, received_message) {
	console.log('**********');
	console.log('handlePostback', received_message);
	console.log('**********');
}

function handleMessage(sender_psid, received_message) {
	console.log('**********');
	console.log('handleMessage', received_message);
	console.log('**********');

  let response;

  // Check if the message contains text
  if (received_message.text) {    

    // Create the payload for a basic text message
    response = {
      "text": `You sent the message: "${received_message.text}". Now send me an image!`
    }
  }  
  
  // Sends the response message
  callSendAPI(sender_psid, response);    
}


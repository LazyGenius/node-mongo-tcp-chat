// Function to generate a random string/token.
function randomString() {
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var string_length = 8;
    var rs = '';

    for (var i=0; i<string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        rs += chars.substring(rnum,rnum+1);
    }

    return rs;
}

// Declare variables.
var clock;
var queue = new Array();
var state;

// Include net.
var net = require('net');

// Bootstrap server.
var server = net.createServer(function (socket) {
	// Intialise database.
	var Db = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server;

	// Intialise database class.
	var db = new Db('chat', new Server("localhost", 27017, {}), {native_parser:false});
	var msg = "";
	var user = "";
	
	i = 0;
	messages = new Array();
	
	// Set initial state.
	state = "register";
	
	// Let's write to the stream if we're still at the registering stage!
	if(state == "register") {
		// Write to stream.
		socket.write("Enter a username:\r\n");
	}
	
	// Main loop to check for new messages.
	setInterval(function(){
		if(state == "pending") {
			db.open(function(error, db) {
				if (error) throw error;
				db.collection('messages', function(err, collection) {
					collection.find({'when':{'$gt':clock}}, {'sort': 'when'}, function(err, cursor) {
						cursor.each(function(err, item) {
							if(!item) {
								// Iterate over queued messages.
								for(var x = 0; x < queue.length; x++) {
									// If we weren't the author, let's write it to the stream.
									if(queue[x].author != user) {
										socket.write(queue[x].message);
									}
								}
								
								// Reset variables.
								i = 0;
								queue = new Array();
								clock = new Date();
							} else {	
								// New item, push it to the queue.
							    queue[i] = new Object();
							    queue[i].author = item.user;
							    queue[i].message = item.user + ": " + item.message + "\r\n";
							    i = i + 1;
							}
						});
					});
				});
			});
		}
	}, "500");
	
	// On data received, do <x>.
	socket.on('data', function(data) {		
		// Check for EOL termination.
		if(data == "\r\n" || data == "\r" || data == "\n" || data == "\n\r" || data == "") {
			if(state == "register") {
				// We're expecting a username, let's set the current user to the received data.
				user = msg;
				
				db.open(function(error, db) {
					if (error) throw error;
					db.collection('users', function(err, collection) {
						collection.find({'user':user}, function(err, cursor) {
							cursor.toArray(function(err, docs) {
								// Does this username already exist?
								if(docs.length > 0) {
									// Yes!
									
									// Ask for token.
									
									// Set variables.
									user = "";
									msg = "";
									state = "register";

									// Write to stream.
									socket.write("That name is in user, please choose another.\r\n");
								} else {
									// This username doesn't exist, let's register it and give the user a token.
									
									// Set authentication token.
									var token = randomString();

									// Send to data store.
									collection.insert({'user':user, 'token':token, 'method':"direct"});

									// Set variables.
									msg = "";
									state = "pending";

									// Write to stream.
									socket.write("Welcome, " + user + ".\r\n");
									socket.write("Token: " + token);
									
									// Set current time.
									var clock = new Date();
									
									// Set user as online.
								}
							});
						});
					});
				});
			} else {					
				db.open(function(error, db) {
					// Load the `messages` collection.
					db.collection('messages', function(err, collection) {
						// Output this message to the console.
						console.log(user + ": " + msg);

						// What's the current time?
						var when = new Date();

						// Insert this message in to the data store.
						collection.insert({'user':user, 'message':msg, 'method':"direct", 'when': when});

						// Reset variables.
						msg = "";
						pending = "";
					});
				});
			}
		} else {
			// Add data to message buffer.
			msg += data;
		}
    });

	socket.on('end', function() {
        // Set user as offline.
    });
});

server.listen(8096, "10.0.0.188");
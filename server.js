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

var clock;
var queue = new Array();
var state;

var net = require('net');

var server = net.createServer(function (socket) {
	var Db = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server;

	var db = new Db('chat', new Server("localhost", 27017, {}), {native_parser:false});
	var msg = "";
	var user = "";
	
	i = 0;
	messages = new Array();
	
	state = "register";
	
	if(state == "register") {
		socket.write("Enter a username:\r\n");
	}
	
	setInterval(function(){
		if(state == "pending") {
			db.open(function(error, db) {
				if (error) throw error;
				db.collection('messages', function(err, collection) {
					collection.find({'when':{'$gt':clock}}, {'sort': 'when'}, function(err, cursor) {
						cursor.each(function(err, item) {
							if(!item) {
								for(var x = 0; x < queue.length; x++) {
									if(queue[x].author != user) {
										socket.write(queue[x].message);
									}
								}
								
								i = 0;
								queue = new Array();
								clock = new Date();
							} else {								
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
	
	db.open(function(error, db) {
		
	});
	
	socket.on('data', function(data) {		
		if(data == "\r\n" || data == "\r" || data == "\n" || data == "\n\r" || data == "") {
			if(state == "register") {
				user = msg;
				
				db.open(function(error, db) {
					if (error) throw error;
					db.collection('users', function(err, collection) {
						collection.find({'user':user}, function(err, cursor) {
							cursor.toArray(function(err, docs) {
								if(docs.length > 0) {
									user = "";
									msg = "";
									state = "register";

									socket.write("That name is in user, please choose another.\r\n");
								} else {
									var token = randomString();

									collection.insert({'user':user, 'token':token, 'method':"direct"});

									msg = "";
									state = "pending";

									socket.write("Welcome, " + user + ".\r\n");
									
									var clock = new Date();
								}
							});
						});
					});
				});
			} else {					
				db.open(function(error, db) {
					db.collection('messages', function(err, collection) {
						console.log(user + ": " + msg);

						var when = new Date();

						collection.insert({'user':user, 'message':msg, 'method':"direct", 'when': when});

						msg = "";
						pending = "";
					});
				});
			}
		} else {
			msg += data;
		}
    });

	socket.on('end', function() {
        //
    });
});

server.listen(8096, "10.0.0.188");
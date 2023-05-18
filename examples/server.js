'use strict';

const port = process.env.PORT || 3000;
const server = require("http").createServer();
const express = require("express");
const fs = require('fs');
const url = require('url');
const bodyParser = require("body-parser");
const request = require('request');
const util = require('util');
const async = require('async');
const client = require('./client');

var app = express();
app.use(bodyParser.json());

server.on("request", app);

// use socket.io
var io = require('socket.io')(server,{

	cors: {    
		origin: "https://t4data.eu10.hcs.cloud.sap",    
		allowedHeaders: ["my-custom-header"],    
		credentials: true  
	},

	allowEIO3: true,
	// origins:["https://t4data.eu10.hcs.cloud.sap"],
	// handlePreflightRequest: (req, res) => {
	// console.log("222");
 //    res.writeHead(200, {
 //      "Access-Control-Allow-Origin": "https://t4data.eu10.hcs.cloud.sap",
 //      "Access-Control-Allow-Methods": "GET,POST",
 //      "Access-Control-Allow-Credentials": true,
 //      "Access-Control-Allow-Headers": "my-custom-header"
 //    });
 //    res.end();
 //  }
});

// define interactions with client
io.sockets.on("connection", function(socket) {
    socket.on('disconnect', function(data) {
        console.log("Disconnected: " + socket.id);
        io.to(socket.id).emit("cmd_req_srv", {
            status: data.message + "|disconnected"
        });
    });
    socket.on('cmd_req', function(data) {
    	var SP_1 = '"COST_PRICE"."slc.train.cost_price.procedure::PRC_TEST_API_INSERT"(';
    	var year = "'"+data.value+"')";
    	SP_1=SP_1+year;
        async.waterfall([connect, 
			async.apply(prepare, SP_1), 
			async.apply(callProc, socket.id, io, data.message)
		], function (err, parameters, rows) {
			client.end();
			if (err) {
				io.to(socket.id).emit("cmd_req_srv", {
                    status: data.message + "|error"
                });
				return console.error('error', err);
				SP_1 = "";
			}
		});
    });
    socket.on('cmd_req_del', function(data) {
    	var SP_2 = '"COST_PRICE"."slc.train.cost_price.procedure::PRC_TEST_API_DELETE"(';
    	var year = "'"+data.value+"')";
    	SP_2=SP_2+year;
        async.waterfall([connect, 
			async.apply(prepare, SP_2), 
			async.apply(callProc, socket.id, io, data.message)
		], function (err, parameters, rows) {
			client.end();
			if (err) {
				io.to(socket.id).emit("cmd_req_srv", {
                    status: data.message + "|error"
                });

				return console.error('error', err);
				SP_2 = "";
			}
		});
    });
});

function connect(cb) {
    client.connect(cb);
}

function prepare(sql, cb) {
    var sql = 'call ' + sql;
	console.log(sql);
    client.prepare(sql, cb);
}

function callProc(socketid, io, message, statement, cb) {
    var values = {};
    statement.exec(values, function onexec(err, parameters, rows) {
        statement.drop();

		io.to(socketid).emit("cmd_req_srv", {
			status: message + "|success"
        });
        cb(err, parameters, rows);
    });
}

//Start the Server 
server.listen(port, function() {
    console.info(`Bot Server: ${server.address().port}`);
    const path  = require("path")
	console.log(path.resolve(__dirname))
});




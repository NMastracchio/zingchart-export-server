var express = require('express');
var app = express();
var zingchartExport = require('./zingchart-export.js');

var server = app.listen(3000, function () {
	var port = server.address().port;
	console.log('Example app listening at http://localhost:%s', port);
});

app.post('/', function (req, res) {
		zingchartExport(req, res, function(err, data){
			if (err) throw err;
			console.log(data);
		});
});
var svgexport = require('svgexport');
var express = require('express');
var multiparty = require('multiparty');
var fs = require('fs');

var app = express();
var re = /((<svg.+?)(?=<img)){1}/;

var server = app.listen(3000, function () {
	var port = server.address().port;
	console.log('Example app listening at http://localhost:%s', port);
});

app.post('/', function (req, res) {
	// Create a new form
	var form = new multiparty.Form();
	//Parse the multipart content
  form.parse(req, function(err, fields, files) {
  	// Grab only the first <svg> element
  	var result = re.exec(fields['svg'][0]);
  	// Open file for writing
  	var writeFile = fs.openSync('./input_svg.svg', 'w');
  	// Inject header
  	var svgString = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' 
  		+ result[1]; 
  	// Fix namespacing
  	var stringToWrite = svgString.replace('xlink="http://www.w3.org/1999/xlink"', 'xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg"');
  	// Write SVG to file
    fs.write(writeFile, stringToWrite, function(){
    	// Render that shit.
    	svgexport.render('./info.json', function(err, data){
				if (err){
					console.log(err);
				}
			});
    });
  });
});
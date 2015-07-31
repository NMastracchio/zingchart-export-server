var fs = require('fs');
var chalk = require('chalk');
var multiparty = require('multiparty');
var phantom = require('phantom');

/**
* ZingChart sends a multipart form via request, so we use multiparty to parse
* the form, and call the function associated with the filetype specified in the
* form.
*/
function parseMultipart(req, res, callback){
  /* Time to (multi)par-taaaaaa*burp*aaaay! */
  var count = 0;
  var form = new multiparty.Form({
    maxFieldsSize:(10 * 1024 * 1024)
  });

  /* Parse the multipart form */
  form.parse(req, function(err, fields, files) {
    if (err) {
      return callback(err);
    }
    console.log(chalk.gray('Multipart form upload: ') + chalk.green('success'));

    var options = {
      svg : fields['svg'][0],
      type : fields['t'][0],
      height : fields['h'][0],
      width : fields['w'][0]
    };

    console.log(chalk.gray(options['width'] + 'x'
      + options['height'] + ' ' + options['type'] + ' requested')
    );
    sanitizeSvg(options['svg'], function(err, timestamp){
      if (err) {
        return callback(err);
      }
      options['timestamp'] = timestamp;
      switch(options['type']){
        case "svg":
          saveAsSvg(res, options, callback);
          break;
        case "jpeg":
          options['type'] = "jpg";
          saveAsImagePdf(res, options, callback);
          break;
        case "png":
        case "pdf":
          saveAsImagePdf(res, options, callback);
          break;
      }
      return null;
    });
  });
}

/**
* Sanitize the SVG field passed in the multipart form and write to file
*/
function sanitizeSvg(svg, callback){

  /* Regex to extract complete <svg> elements */
  var re = /((<svg.+?)(?=<img)){1}/;
  var result = re.exec(svg);

  /* Inject SVG header, fix namespace */
  var svgString = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
    + result[1];
  var stringToWrite = svgString.replace(
    'xlink="http://www.w3.org/1999/xlink"', 
    'xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg"'
  );

  /* Open file for writing, write sanitized SVG */
  var timestamp = (new Date().getTime());
  var svgFilename = './zingchart' + timestamp + '.svg';
  var svgWriteFile = fs.open(svgFilename, 'w', function (err, data) {
    fs.write(data, stringToWrite, function (err) {
      if (err) {
        return callback(err);
      }
      console.log(
        chalk.gray('Writing <svg> element to ' + svgFilename + ': ') 
        + chalk.green('success')
      );
      return callback(null, timestamp);
    });
  });
}

/**
* Creates an instance of a PhantomJS WebPage object, sets the viewport
* dimensions to that of the original chart, opens the sanitized .svg file in the
* phantom page, and outputs it to the desired format, prompting the user
* to download.
*/
function saveAsImagePdf(res, options, callback){
  var svgFilename = 'zingchart' + options['timestamp'] + '.svg';
  var outputFilename = 'zingchart' + options['timestamp'] + '.' + options['type']; 
  phantom.create(function (ph) {
    ph.createPage(function (page) {
      page.viewportSize = {
        width: options['width'], 
        height: options['height'] 
      };
      page.open(svgFilename, function (status) {
        if (status == 'fail'){
          return callback(chalk.red('Failed to render file in Phantom'));
        } 
        console.log(
          chalk.gray('Opening ' + svgFilename + ' file with Phantom: ') 
            + chalk.green(status)
          );
        page.render(outputFilename, function(err, data){
          if (err){
            return callback(err);
          }
          console.log(
            chalk.gray('Saving ' + svgFilename + ' as ' + outputFilename + ': ') 
            + chalk.green('success')
          );
          res.download(outputFilename, outputFilename, function(err){
            if (err){
              return callback(err);
            }
            return callback(null, chalk.green('File downloaded successfully.'));
          });
        });
      });
    });
  });
}

/**
* Simply prompts the user to download the sanitized version of the svg saved
*  in the sanitizeSvg() function.
*/
function saveAsSvg(res, options, callback){
  var filename = './zingchart' + options['timestamp'] + '.svg';
  res.download(filename, filename, function(err){
    if (err){
      return callback(err);
    }
    return callback(null, chalk.green('File downloaded successfully.'));
  });
}

module.exports = function(req, res, callback){
  parseMultipart(req, res, callback);
};
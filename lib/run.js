var request         = require('request') 
  , fs              = require('fs-extra')
  , open            = require('open')
  , tmp             = require('tmp')
  , mime            = require('mime-type/with-db')
  , Promise         = require('bluebird')
  ;

function run(run_url, text) {
  var opts = {
      method  : 'GET'
    , url     : run_url
  };
  
  if (text) {
    opts.method = 'POST';
    opts.body = text;
  }
  
  return Promise
          .promisify(tmp.tmpName)({ prefix : 'taskmill-'/*, postfix : '.tmp'*/ })
          .then(function(filename) {
              return new Promise(function(resolve, reject){
                  var res = request(opts)
                              .on('response', function(response) {
                                  var ext = mime.extension(response.headers['content-type'])
                                    , enc = mime.charset(response.headers['content-type']) || 'binary'
                                    ;
                                  
                                  if (ext) {
                                    filename = filename + '.' + ext;   
                                  }
                                  
                                  var to = fs.createOutputStream(filename, { defaultEncoding : enc });
                                  
                                  res.pipe(to)
                                      .on('finish', function () {
                                        resolve({
                                            encoding  : enc
                                          , path      : filename
                                          , open      : function() { return open(filename); }
                                          , readFile  : function() { return Promise.promisify(fs.readFile)(filename, { encoding : enc }); }
                                          , headers   : response.headers
                                        });
                                      })
                                      .on('error', function(err){
                                          reject(err);
                                      }); 
                              })
                              .on('error', function(err){ reject(err); });
              }); 
          });
}

module.exports = run;
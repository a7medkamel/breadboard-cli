var request         = require('request') 
  , _               = require('lodash')
  , fs              = require('fs-extra')
  , open            = require('open')
  , tmp             = require('tmp')
  , mime            = require('mime-type/with-db')
  , Promise         = require('bluebird')
  ;

function run(run_url, input) {
  return Promise
          .promisify(tmp.tmpName)({ prefix : 'breadboard-'/*, postfix : '.tmp'*/ })
          .then(function(filename) {
              return new Promise(function(resolve, reject){
                var opts = {
                    method  : !input? 'GET' : 'POST'
                  , url     : run_url
                  , body    : input
                };

                request(opts)
                  .on('response', function(response) {
                      var ext     = mime.extension(response.headers['content-type'])
                        , enc     = mime.charset(response.headers['content-type']) || 'binary'
                        , pragma  = []
                        ;
                      
                      try {
                        pragma = JSON.parse(response.headers['manual-pragma']);
                      } catch (err) {}

                      if (ext) {
                        filename = filename + '.' + ext;   
                      }
                      
                      var to = fs.createOutputStream(filename, { defaultEncoding : enc });
                      
                      response
                          .pipe(to)
                          .on('finish', function () {
                            resolve({
                                encoding          : enc
                              , path              : filename
                              , headers           : response.headers
                              , pragma            : pragma
                              , open              : function() { return open(filename); }
                              , readFile          : function() { return Promise.promisify(fs.readFile)(filename, { encoding : enc }); }
                              , createReadStream  : function() { return Promise.resolve(fs.createReadStream(filename, { encoding : enc })); }
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
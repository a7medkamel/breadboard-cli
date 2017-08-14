var Promise             = require('bluebird')
  , _                   = require('lodash')
  , request             = require('request')
  , urljoin             = require('url-join')
  , fs                  = require('fs')
  ;

function run(cmd, options = {}) {
  let { owner, repo, host, git, platform, filename, token } = options;

  return Promise
          .try(() => {
            if (!host) {
              host = 'https://breadboard.io';
            }

            if (!git) {
              git = 'github.com';
            }

            if (!platform) {
              platform = 'github';
            }

            let pathname  = git.stringify(platform, owner, repo, '$.js')
              , uri       = urljoin(host, git, pathname)
              ;

            return Promise
                    .fromCallback((cb) => {
                      fs.readFile(filename, 'utf8', cb);
                    })
                    .then((text) => {
                      let headers = {
                          blob          : (new Buffer(text)).toString('base64')
                        , Authorization : `Bearer ${token}`
                      };

                      return request({
                                  method : 'POST'
                                , uri
                                , headers
                              });
                    });
          });
}

module.exports = exec;

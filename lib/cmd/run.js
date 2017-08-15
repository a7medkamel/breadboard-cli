var Promise             = require('bluebird')
  , _                   = require('lodash')
  , request             = require('request')
  , urljoin             = require('url-join')
  , { URL }             = require('url')
  , fs                  = require('fs')
  , path                = require('path')
  , git                 = require('taskmill-core-git')
  , contentType         = require('content-type')
  , { pd }              = require('pretty-data')
  , find_parent_dir     = require('find-parent-dir')
  , parse_git_config    = require('parse-git-config')
  ;

function git_info(filename) {
  let dirname = path.dirname(filename);
  
  return Promise
          .fromCallback((cb) => {
            find_parent_dir(dirname, '.git', cb);
          })
          .then((cwd) => {
            return Promise.fromCallback((cb) => { parse_git_config({ cwd, path : '.git/config' }, cb); });
          });
}

function exec(cmd, options = {}) {
  // node ../../a7medkamel/breadboard-cli/index.js run qa breadboard deploy_saw.js -h http://breadboard.docusignhq.com -g github.docusignhq.com -t w0pPfvanSpp2
  // m6Ro6rjG -q "{ \"host\" : \"http://sawmill.docusignhq.com\" }"
  let { filename } = options;
  
  
  return git_info(filename)
          .then((result = {}) => {
            let remote = git.remote(result['remote "origin"']['url']);
            
            let def = {
                owner : remote.username
              , repo  : remote.repo
              , git   : remote.hostname
            };
            
            return _.defaults(options, def);
          })
          .then((options = {}) => {
            let { owner, repo, host, git : git_host, platform, filename, qs, token } = options;
            
            return Promise
                    .try(() => {
                      if (!host) {
                        host = 'https://breadboard.io';
                      }
                      
                      if (!git_host) {
                        git_host = 'github.com';
                      }
                      
                      if (!platform) {
                        platform = 'github';
                      }
                      
                      qs = qs || {};
                      if (qs) {
                        if (_.isString(qs)) {
                          qs = JSON.parse(qs);
                        }
                      }
                      
                      let pathname  = git.stringify(platform, owner, repo, '$.js')
                        , uri       = urljoin(host, git_host, pathname)
                        ;
                      
                      return Promise
                              .fromCallback((cb) => {
                                fs.readFile(filename, 'utf8', cb);
                              })
                              .then((text) => {
                                qs['Authorization'] = `Bearer ${token}`;
                                
                                let headers = {
                                    blob          : (new Buffer(text)).toString('base64')
                                  // , Authorization : `Bearer ${token}`
                                };
                                
                                let ep        = git.stringify(platform, owner, repo, filename)
                                  , url       = new URL(ep, urljoin(host, git_host))
                                  ;
                                
                                _.each(qs, (ret, key) => {
                                  url.searchParams.set(key, ret);
                                });
                                  
                                console.log(`HTTP POST ${url.href}`)
                                return Promise
                                        .fromCallback((cb) => {
                                          request({ method : 'POST', uri, headers, qs }, (error, response, body) => {
                                            cb(error, { response, body });
                                          });
                                        })
                                        .then((result) => {
                                          let { response, body } = result;
                                          
                                          return Promise
                                                  .try(() => {
                                                    let ctype = contentType.parse(response);
                                                    
                                                    switch(ctype.type) {
                                                      case 'application/json':
                                                      console.log(pd.json(body));
                                                      break;
                                                      default:
                                                      throw new Error('unknown content-type')
                                                    }
                                                  })
                                                  .catch(() => {
                                                    console.log(body);
                                                  });
                                        });
                              });
                    });
          })
          .catch((err) => {
            console.error(err);
          });
}

module.exports = { exec };

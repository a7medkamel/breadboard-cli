var Promise                   = require('bluebird')
  , _                         = require('lodash')
  , request                   = require('request')
  , urljoin                   = require('url-join')
  , { URL }                   = require('url')
  , fs                        = require('fs')
  , path                      = require('path')
  , git                       = require('taskmill-core-git')
  , contentType               = require('content-type')
  , { pd }                    = require('pretty-data')
  , find_parent_dir           = require('find-parent-dir')
  , parse_git_config          = require('parse-git-config')
  , term                      = require('terminal-kit').terminal
  , { Client : tailf_client } = require('taskmill-core-tailf')
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

  let make_options = git_info(filename)
                      .then((result = {}) => {
                        let remote = git.remote(result['remote "origin"']['url']);

                        let def = {
                            owner : remote.username
                          , repo  : remote.repo
                          , git   : remote.hostname
                        };

                        return _.defaults(options, def);
                      });

  let make_tailf = tailf_client.connect();

  return Promise
          .all([make_options, make_tailf])
          .spread((options = {}, client) => {
            let { owner, repo, host, git : git_host, platform, filename, qs, token } = options;

            client.on('data', (payload) => {
              if (payload.type == 'stdout') {
                term.colorRgb(95,135,0).bold('>')(' ')(payload.text);
                return;
              }

              if (payload.type == 'stderr') {
                term.colorRgb(175,0,0)('>')('\t').red(payload.text);
                return;
              }
            });

            client.on('end', (payload) => {
              console.log('----end-----');
            });

            return Promise
                    .try(() => {
                      if (!host) {
                        host = 'https://foobar.run';
                      }

                      if (!git_host) {
                        git_host = 'github.com';
                      }

                      qs = qs || {};
                      if (qs) {
                        if (_.isString(qs)) {
                          qs = JSON.parse(qs);
                        }
                      }

                      return Promise
                              .fromCallback((cb) => {
                                fs.readFile(filename, 'utf8', cb);
                              })
                              .then((text) => {
                                let headers = {
                                    blob          : (new Buffer(text)).toString('base64')
                                  , tailf         : client.uri()
                                  // , Authorization : `Bearer ${token}`
                                };

                                let url = git.url(git_host, owner, repo, '$.js', { platform, breadboard : host, token });

                                _.each(qs, (ret, key) => {
                                  url.searchParams.set(key, ret);
                                });

                                term.colorRgb(138,138,138)('POST')(' ').colorRgb(175,135,0)(url.href)('\n')
                                // console.log(`HTTP POST ${url.href}`)
                                return Promise
                                        .fromCallback((cb) => {
                                          request({ method : 'POST', uri : url.toString(), headers, qs }, (error, response, body) => {
                                            cb(error, { response, body });
                                          });
                                        })
                                        .then((result) => {
                                          let { response, body } = result;

                                          term.colorRgb(0,135,255)('HTTP').colorRgb(175,0,95)('/').colorRgb(95,95,175)('1.1')(' ').colorRgb(95,95,175)(response.statusCode)(' ').colorRgb(95,135,0)('OK')('\n')
                                          _.each(response.headers, (s, key) => {
                                            term.colorRgb(95,135,0).bold(key).colorRgb(175,0,95)(':')(' ').colorRgb(215,215,175)(s)('\n');
                                          });
                                          term('\n');
                                          
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
                                                    term.defaultColor(body)('\n');
                                                  });
                                        });
                              });
                    });
          })
          .catch((err) => {
            console.error(err);
          })
          .finally(() => {
            // todo [akamel] wait for tailf instead of timeout
            setTimeout(() => {
              process.exit();
            }, 1000);
          });
}

module.exports = { exec };

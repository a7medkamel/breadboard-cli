var Promise                   = require('bluebird')
  , _                         = require('lodash')
  , request                   = require('request')
  , urljoin                   = require('url-join')
  , winston                   = require('winston')
  , { URL }                   = require('url')
  , fs                        = require('fs')
  , path                      = require('path')
  , git                       = require('taskmill-core-git')
  , contentType               = require('content-type')
  , { pd }                    = require('pretty-data')
  , find_parent_dir           = require('find-parent-dir')
  , parse_git_config          = require('parse-git-config')
  , term                      = require('terminal-kit').terminal
  , tailf                     = require('tailf.io-sdk')
  , tar                       = require('tar-fs')
  , B64                       = require('b64')
  , ms                        = require('ms')
  , to_string                 = require('stream-to-string')
  //
  , open                      = require('open')
  , tmp                       = require('tmp')
  , fs                        = require('fs')
  , mime                      = require('mime-type/with-db')
  , createOutputStream        = require('create-output-stream')
  , onFinished                = require('on-finished')
  ;

// https://github.com/tomislav/osx-terminal.app-colors-solarized
// SOLARIZED HEX     16/8 TERMCOL  XTERM/HEX   L*A*B      RGB         HSB         GNU screen
// --------- ------- ---- -------  ----------- ---------- ----------- ----------- -----------
// base03    #002b36  8/4 brblack  234 #1c1c1c 15 -12 -12   0  43  54 193 100  21 K
// base02    #073642  0/4 black    235 #262626 20 -12 -12   7  54  66 192  90  26 k
// base01    #586e75 10/7 brgreen  240 #585858 45 -07 -07  88 110 117 194  25  46 G
// base00    #657b83 11/7 bryellow 241 #626262 50 -07 -07 101 123 131 195  23  51 Y
// base0     #839496 12/6 brblue   244 #808080 60 -06 -03 131 148 150 186  13  59 B
// base1     #93a1a1 14/4 brcyan   245 #8a8a8a 65 -05 -02 147 161 161 180   9  63 C
// base2     #eee8d5  7/7 white    254 #e4e4e4 92 -00  10 238 232 213  44  11  93 w
// base3     #fdf6e3 15/7 brwhite  230 #ffffd7 97  00  10 253 246 227  44  10  99 W
// yellow    #b58900  3/3 yellow   136 #af8700 60  10  65 181 137   0  45 100  71 y
// orange    #cb4b16  9/3 brred    166 #d75f00 50  50  55 203  75  22  18  89  80 R
// red       #d30102  1/1 red      124 #af0000 45  70  60 211   1   2   0  99  83 r
// magenta   #d33682  5/5 magenta  125 #af005f 50  65 -05 211  54 130 331  74  83 m
// violet    #6c71c4 13/5 brmagenta 61 #5f5faf 50  15 -45 108 113 196 237  45  77 M
// blue      #268bd2  4/4 blue      33 #0087ff 55 -10 -45  38 139 210 205  82  82 b
// cyan      #2aa198  6/6 cyan      37 #00afaf 60 -35 -05  42 161 152 175  74  63 c
// green     #859900  2/2 green     64 #5f8700 60 -20  65 133 153   0  68 100  60 g

const base03    = '#002b36';
const base02    = '#073642';
const base01    = '#586e75';
const base00    = '#657b83';
const base0     = '#839496';
const base1     = '#93a1a1';
const base2     = '#eee8d5';
const base3     = '#fdf6e3';
const yellow    = '#b58900';
const orange    = '#cb4b16';
const red       = '#d30102';
const magenta   = '#d33682';
const violet    = '#6c71c4';
const blue      = '#268bd2';
const cyan      = '#2aa198';
const green     = '#859900';

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

const TAILF_TIMEOUT = 20 * 1000;
const TAILF_TIMEOUT_AFTER_RESPONSE = 5 * 1000;

function exec(cmd, options = {}) {
  // node ../../a7medkamel/breadboard-cli/index.js run qa breadboard deploy_saw.js -h http://breadboard.docusignhq.com -g github.docusignhq.com -t w0pPfvanSpp2
  // m6Ro6rjG -q "{ \"host\" : \"http://sawmill.docusignhq.com\" }"
  let { filename, content } = options;

  let make_options = git_info(filename)
                      .catch((err) => {})
                      .then((result = {}) => {
                        let def = {};

                        if (result['remote "origin"']) {
                          let remote = git.remote(result['remote "origin"']['url']);

                          def = {
                              owner : remote.username
                            , repo  : remote.repo
                            , git   : remote.hostname
                          };
                        }

                        return _.defaults(options, def);
                      });

  let make_tailf = tailf
                    .Api
                    .open()
                    .then((result) => {
                      let { token, id, uri, host, write_url } = result;

                      return tailf
                              .Client
                              .connect(uri, { token })
                              .then((client) => {
                                return { client, result };
                              });
                    })
                    .timeout(TAILF_TIMEOUT);

  let make_content = Promise
                      .fromCallback((cb) => {
                        if (!content) {
                          cb();
                          return;
                        }

                        fs.readFile(content, 'utf8', cb);
                      });

  return Promise
          .all([make_options, make_tailf, make_content])
          .spread((options = {}, tf, body) => {
            let { owner, repo, host, git : git_host, platform, filename, qs, token } = options;

            tf.client.on('data', (payload) => {
              if (payload.type == 'stdout') {
                term.colorRgbHex(green).bold('>')(' ')(payload.text);
                return;
              }

              if (payload.type == 'stderr') {
                term.colorRgbHex(red)('>')('\t').red(payload.text);
                return;
              }
            });

            let client_end_async = Promise.fromCallback((cb) => { tf.client.on('end', () => cb()); });

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
                                // let ret = new B64.Encoder();
                                // tar
                                //   .pack('.', {
                                //     ignore: (name) => {
                                //       if (/^\.git(\/)?/.test(name)) {
                                //         return true;
                                //       }
                                //
                                //       if (/^\.gitignore$/.test(name)) {
                                //         return true;
                                //       }
                                //
                                //       if (/^node_modules(\/)?/.test(name)) {
                                //         return true;
                                //       }
                                //
                                //       if (/^\.DS_Store$/.test(name)) {
                                //         return true;
                                //       }
                                //     }
                                //   })
                                //   .pipe(ret);
                                //
                                // ret
                                //   .on('finish', () => { cb(undefined, ret); })
                                //   .on('error', cb);

                                fs.readFile(filename, 'utf8', cb);
                              })
                              // .then(to_string)
                              .then((text) => {
                                let headers = {
                                  blob          : (new Buffer(text)).toString('base64')
                                    // blob          : text
                                  // , `blob-type`   : 'application/x-gtar'
                                  , tailf         : tf.result.write_url
                                  , Authorization : `Bearer ${token}`
                                  , 'content-type': 'text/plain'
                                };

                                // let url = git.url(git_host, owner, repo, '$.js', { platform, breadboard : host, token });
                                let url = git.url(git_host, owner, repo, '$.js', { platform, breadboard : host });

                                _.each(qs, (ret, key) => {
                                  url.searchParams.set(key, ret);
                                });

                                term.colorRgbHex(base00)('POST')(' ').colorRgbHex(yellow)(url.href)('\n')
                                console.log(`HTTP POST ${url.href}`)
                                return Promise
                                        .fromCallback((cb) => {
                                          tmp.tmpName({ prefix : 'breadboard-'/*, postfix : '.tmp'*/ }, cb);
                                        })
                                        .then((filename) => {
                                          return Promise
                                                  .fromCallback((cb) => {
                                                    request({ method : 'POST', uri : url.toString(), headers, qs, body, timeout : ms('4m') })
                                                      .on('response', (response) => {
                                                        term.colorRgbHex(blue)('HTTP').colorRgbHex(magenta)('/').colorRgbHex(violet)('1.1')(' ').colorRgbHex(violet)(response.statusCode)(' ').colorRgbHex(green)('OK')('\n')
                                                        _.each(response.headers, (s, key) => {
                                                          term.colorRgbHex(green)(key).colorRgbHex(magenta)(':')(' ').colorRgbHex(base2)(s)('\n');
                                                        });
                                                        term('\n');

                                                        let ctype = contentType.parse(response);

                                                        let ext     = mime.extension(ctype.type)
                                                          , enc     = mime.charset(ctype.type) || 'binary'
                                                          , pragma  = []
                                                          ;

                                                        try {
                                                          pragma = JSON.parse(response.headers['manual-pragma']);
                                                        } catch (err) {}

                                                        if (ext) {
                                                          filename = filename + '.' + ext;
                                                        }

                                                        let to = createOutputStream(filename, { defaultEncoding : enc });

                                                        response.pipe(to);
                                                        // if (ctype.type != 'image/png') {
                                                        //   response.pipe(process.stdout);
                                                        // }
                                                        // to.write(body);
                                                        // to.end();

                                                        return Promise
                                                                .fromCallback((cb) => onFinished(to, cb))
                                                                .then(() => console.log(filename))
                                                                .then(() => open(filename))
                                                                .asCallback(cb);
                                                      })
                                                      .on('error', cb);
                                                  })

                                          // todo [akamel]
                                          // term.defaultColor(body)('\n');


                                          // let req = request({ method : 'POST', uri : url.toString(), headers, qs, body }, (error, response, body) => {
                                          //   cb(error, { response, body });
                                          // });
                                        })
                                        // .then((result) => {
                                        //   let { response, body } = result;
                                        //
                                        //
                                        // });
                              });
                    })
                    .then(() => {
                      // wait for client stdio stream to end;
                      // todo [akamel] what if we don't get an end event?
                      return client_end_async.timeout(TAILF_TIMEOUT_AFTER_RESPONSE).catch((TimeoutError, err) => {});
                    });
          })
          .catch((err) => {
            winston.error(err);
          })
          .finally(() => {
            process.exit();
          });
}

module.exports = { exec };

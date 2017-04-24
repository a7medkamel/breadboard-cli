var rp      = require('request-promise')
  , _       = require('lodash')
  , urljoin = require('url-join')
  ;

var config = {
  "editor-api" : {
    "url" : "http://editor.breadboard.io"
  }
};

config.get = function(p) { return _.get(config, p); }

function search(query) {
  let url = urljoin(config.get('editor-api.url'), 'script');

  if (query) {
    url += `?query=${query}`;
  }

  var opts = {
      url     : url
    , json    : true
  };

  return rp.get(opts);
}

module.exports = search;

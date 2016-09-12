var rp      = require('request-promise')
  , urljoin = require('url-join')
  ;

var config = {
  "editor-api" : {
    "url" : "http://editor.breadboard.io"
  }
};

function search(query) {
  let url = urljoin(config.get('editor-api.url'), 'script');

  if (query) {
    url += `?query=${query}`;
  }

  var opts = {
      url     : url
    , json    : true
  };

  console.log(opts);
  return rp.get(opts);
}

module.exports = search;
var rp      = require('request-promise')
  , urljoin = require('url-join')
  , config  = require('config')
  ;

function search(query) {
  let url = urljoin(config.get('editor-api.url'), 'script')
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
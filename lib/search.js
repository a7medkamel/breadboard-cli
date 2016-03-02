var rp = require('request-promise');

function search(term) {
  var opts = {
      url     : 'https://taskmill.io/script/search'
    , json    : true
  };

  return rp.get(opts);
}

module.exports = search;
var search  = require('./lib/search')
  , run     = require('./lib/run')
  ;

if (!module.parent) {
    // todo [akamel] support cli stream stdin
    run();
}

module.exports = {
    search  : search
  , run     : run
};
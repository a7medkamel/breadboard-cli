var search  = require('./lib/search')
  , run     = require('./lib/run')
  , argv    = require('minimist')(process.argv.slice(2));
  ;

if (!module.parent) {
  var url = argv['_'][0];
  if (!url) {
    throw new Error('script url is required');
  }

  // http://stackoverflow.com/questions/15466383/how-to-detect-if-a-node-js-script-is-running-through-a-shell-pipe
  var input = process.stdin.isTTY? argv['i'] : process.stdin;

  run(url, input)
    .then(function(result){
      if (process.stdin.isTTY && result.encoding === 'binary') {
        return result.open();
      }
      
      return result
                .createReadStream()
                .then(function(stream){
                  stream.pipe(process.stdout);
                });
    })
    .catch(function(err){
      console.error(err);
    });
}

module.exports = {
    search  : search
  , run     : run
};
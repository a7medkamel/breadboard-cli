var program = require('commander')
  , cmd_run = require('./cmd/run')
  ;

function exec() {
  program
    .version('0.1.0')
    .arguments('<cmd> [variadic...]')
    .option('-u, --owner [value]', 'git repository owner')
    .option('-r, --repo [value]', 'git repository name')
    .option('-h, --host [value]', 'breadboard host')
    .option('-g, --git [value]', 'git host')
    // .option('-f, --filename [value]', 'local file to run')
    .option('-t, --token [value]', 'token')
    .option('-q, --qs [value]', 'query string')
    .action((cmd, variadic) => {
      let { host, owner, repo, git, qs, token } = program;
      
      let filename = variadic[0];
      
      return cmd_run.exec(cmd, { owner, repo, host, git, filename, qs, token });
    })
    .parse(process.argv);
}
  
module.exports = {
    exec
};

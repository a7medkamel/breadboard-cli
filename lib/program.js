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
    // .option('-b, --body [value]', 'body to send')
    .option('-c, --content [value]', 'file content to send')
    .action((cmd, variadic) => {
      let { host, owner, repo, git, qs, token, content } = program;

      let filename = variadic[0];

      return cmd_run.exec(cmd, { owner, repo, host, git, filename, qs, token, content });
    })
    .parse(process.argv);
}

module.exports = {
    exec
};

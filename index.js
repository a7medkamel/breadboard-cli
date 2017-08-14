var program = require('commander')
  , cmd_run = require('lib/cmd/run')
  ;

program
  .version('0.1.0')
  .arguments('<cmd> [owner] [repo]')
  .option('-h, --host [value]', 'breadboard host')
  .option('-g, --git [value]', 'git host')
  .option('-f, --filename [value]', 'local file to run')
  .option('-t, --token [value]', 'token')
  .action((cmd, owner, repo) => {
    let { filename, host, git, token } = program;

    return cmd_run.exec(cmd, { owner, repo, host, git, filename, token });
  })
  .parse(process.argv);

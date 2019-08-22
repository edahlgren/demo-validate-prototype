const cli = require('command-line-args');

const cliSpec = [
    { name: 'demofile' },
    { name: 'spec' }
];

const args = cli(cliSpec);
if (!args.demofile) {
    console.log("need a path to a demo.yml file (--demofile)");
    process.exit(1);
}
if (!args.spec) {
    console.log("need a path to a spec.yml file (--spec)");
    process.exit(1);
}

const yaml = require('js-yaml');
const fs   = require('fs');
const util = require('util');

var metadata = '';
var spec = '';

try {
    metadata = yaml.safeLoad(fs.readFileSync(args.demofile, 'utf8'));
    spec = yaml.safeLoad(fs.readFileSync(args.spec, 'utf8'));
} catch (e) {
    console.log("failed to load yaml:", e);
    process.exit(1);
}

console.log("[metadata]");
console.log(util.inspect(metadata, false, null, true /* enable colors */));

console.log("[spec]");
console.log(util.inspect(spec, false, null, true /* enable colors */));

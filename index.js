// Prototype for 'demo validate'

/////////////////////////////////////////////////////////////////////////////////


const cli = require('command-line-args');
const logSymbols = require('log-symbols');
const parse = require('./parse');
const check = require('./check');

const cliSpec = [
    { name: 'demofile' },
    { name: 'spec' }
];

const debug = false;


/////////////////////////////////////////////////////////////////////////////////


function main() {
    
    // Parse args
    const args = cli(cliSpec);
    if (!args.demofile) {
        console.log("Need a path to a demo.yml file (--demofile)");
        process.exit(1);
    }
    if (!args.spec) {
        console.log("Need a path to a spec.yml file (--spec)");
        process.exit(1);
    }

    // Parse YAML files
    var data = do_parse(args.demofile, args.spec);
    if (!data)
        process.exit(1);

    // Dump a mapping for debugging purposes
    if (debug)
        dump_bound_paths(data);
    
    // Check the data
    var ok = do_check(args.demofile, data);
    if (!ok)
        process.exit(1);
    
    process.exit(0);
}


main();


/////////////////////////////////////////////////////////////////////////////////


function do_parse(meta_file, spec_file) {

    console.log("\nParsing data and spec ...");
    var parse_result = parse.parse(meta_file, spec_file, true /* show progress */);
    
    if (!parse_result.ok) {    
        console.log(logSymbols.error, "Unexpected error:", parse_result.msg);
        if (parse_result.buggy) {
            console.log("  This is likely a bug, so a report has been written to bug.log.");
            console.log("  Please send a copy of this report to bugs@public-code.org.");
        }
        return undefined;
    }

    console.log(logSymbols.success, "Parsing successful");
    return parse_result.data;
}

function dump_bound_paths(data) {
    
    console.log("\nHow data maps to the spec:\n");
    data.meta.bound.forEach(function(value, key, map) {
        console.log("   ", "(data)" + parse.joinPath(key),
                    "->", "(spec)" + parse.joinPath(value));    
    });
}

function do_check(meta_file, data) {

    console.log("\nChecking", meta_file, "...");
    var check_result = check.check(data, true /* show progress */);

    if (!check_result.ok) {
        console.log(logSymbols.error, "Unexpected error:", check_result.msg);
        if (check_result.buggy) {
            console.log("  This is likely a bug, so a report has been written to bug.log.");
            console.log("  Please send a copy of this report to bugs@public-code.org.");
        }
        return false;
    }

    var issues = check_result.issues;

    if (issues.length == 0) {
        console.log(logSymbols.success, "All checks successful");
        return true;
    }
    
    console.log("\nDetails:\n");

    issues.forEach(function(issue) {
        if (issue.warn) {
            console.log(" ", logSymbols.warn, issue.msg);
            issue.paths.forEach(function(path) {
                console.log("  -", "(" + meta_file + ")" + parse.joinPath(path));
            });
        } else {
            console.log(" ", logSymbols.error, issue.msg);
            issue.paths.forEach(function(path) {
                console.log("  -", "(" + meta_file + ")" + parse.joinPath(path));
            });
        }
    });

    return true;
}

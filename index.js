// Prototype for 'demo validate'

/////////////////////////////////////////////////////////////////////////////////


const cli = require('command-line-args');
const yaml = require('js-yaml');
const fs   = require('fs');

const logSymbols = require('log-symbols');
const parse = require('./parse');
const check = require('./check');

const cliSpec = [
    { name: 'demofile' },
    { name: 'specs', multiple: true }
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
    if (!args.specs) {
        console.log("Need a path to a spec.yml file (--spec)");
        process.exit(1);
    }

    // Read the demofile as YAML
    var metaObj = read_yaml(args.demofile);
    if (!metaObj)
        process.exit(1);

    // Parse and check the sections of demofile that correspond
    // to the given specs. This is fine for a prototype, but there should
    // be progress logs for each section, and details about all issues
    // at the end, so no early exiting.
    args.specs.forEach(function(spec_file) {
        // Read the spec
        var spec = read_yaml(spec_file);
        if (!spec)
            process.exit(1);

        // Check that demofile defines the section defined by this spec
        var name = Object.keys(spec)[0];
        if (!metaObj.hasOwnProperty(name)) {
            console.log(logSymbols.error, "Missing section '" + name + "', can't validate");
            process.exit(1);
        }

        // Create an object to mirror the one in the spec
        var section = {};
        section[name] = metaObj[name];

        // Parse the section
        var data = do_parse(section, spec);
        if (!data)
            process.exit(1);
        
        // Check the section
        var ok = do_check(args.demofile, data);
        if (!ok)
            process.exit(1);
    });
    
    process.exit(0);
}


main();


/////////////////////////////////////////////////////////////////////////////////


function read_yaml(file) {
    try {
        return yaml.safeLoad(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        console.error("failed to read", file, " as YAML");
        return undefined;
    }
}

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
        console.log("");
        console.log(logSymbols.success, "All checks successful");
        console.log("");
        return true;
    }

    console.log("\nChecks failed. Details:\n");

    issues.forEach(function(issue) {
        var symbol = logSymbols.error;
        if (issue.warn)
            symbol = logSymbols.warning;

        switch (issue.type) {
        case check.ISSUE_EXTRA_METADATA:
            console.log(" ", symbol, "This data isn't recognized and won't be used:");
            issue.paths.forEach(function(path) {
                console.log("    -", parse.joinPath(path));
            });
            break;
            
        case check.ISSUE_REQUIRED_METADATA:
            console.log(" ", symbol, "These fields are required but weren't found:");
            issue.paths.forEach(function(path) {
                console.log("    -", parse.joinPath(path));
            });
            break;
            
        case check.ISSUE_CHECKED_VALUE:
            console.log(" ", symbol, issue.path, "\n");
            console.log("    ", "value:", issue.value);
            console.log("    ", "issues:");
            issue.issues.forEach(function(subissue) {
                console.log("        -", subissue);
            });
            break;

        default:
            console.log(logSymbols.error, "Internal error: parsing issues failed");
            if (check_result.buggy) {
                console.log("  This is likely a bug, so a report has been written to bug.log.");
                console.log("  Please send a copy of this report to bugs@public-code.org.");
            }
            return false;
        }
        console.log("");

    });
    console.log("");

    return true;
}

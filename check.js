const logSymbols = require('log-symbols');
const parse = require('./parse');

function check(data, showProgress) {
    var issues = [];

    // Check unbound data for issues first.
    var check_result = checkUnbound(data);
    if (!check_result.ok) {
        return {
            ok: false,
            buggy: true,
            issues: [],
            msg: check_result.msg
        };
    }
    issues = issues.concat(check_result.issues);

    // Check each of the bound fields
    data.meta.bound.forEach(function(value, key, map) {

        // Lookup the metadata object
        var lookup_result_m = parse.lookup(data.meta.obj, key,
                                           false /* has constraints */);
        if (!lookup_result_m.ok) {
            return {
                ok: false,
                buggy: true,
                issues: [],
                msg: lookup_result_m.msg
            };
        }
        var meta = lookup_result_m.value;

        // Lookup the spec object
        var lookup_result_s = parse.lookup(data.spec.obj, value,
                                           true /* has constraints */);
        if (!lookup_result_s.ok) {
            return {
                ok: false,
                buggy: true,
                issues: [],
                msg: lookup_result_s.msg
            };
        }
        var spec = lookup_result_s.value;

        var result = checkValue(key, meta, spec.constraints, showProgress);
        if (!result.ok) {
            return {
                ok: false,
                buggy: true,
                issues: [],
                msg: result.msg
            };
        }

        issues = issues.concat(result.issues);
    });

    return {
        ok: true,
        buggy: false,
        issues: issues,
        msg: ""
    };
}

function checkUnbound(data) {
    var issues = [];
    
    // Check for unbound metadata. It might be OK to have the extra
    // data but warn the user in case they intended it to be used.
    if (data.meta.unbound.length > 0) {
        issues.push({
            warn: true,
            msg: "Some of your metadata won't be used",
            paths: data.unbound.meta
        });
    }

    // Check for unused specs. These are only OK if the spec itself
    // says that the metadata field can be empty.
    if (data.spec.unbound.length > 0) {

        var required = data.spec.unbound.filter(function(path) {
            var lookup_result = parse.lookup(data.spec.obj, path,
                                             true /* has constraints */);
            if (!lookup_result.ok) {
                return {
                    ok: false,
                    buggy: true,
                    msg: lookup_result.bug,
                    issues: []
                };
            }
            var spec = lookup_result.value;
            
            return spec.constraints.includes("non-empty");
        });

        if (required.length > 0) {
            issues.push({
                warn: false,
                msg: "You're missing required fields",
                paths: required
            });
        }
    }

    return {
        ok: true,
        msg: "",
        issues: issues
    };
}

function checkValue(path, value, constraints, showProgress) {
    var issues = [];
    
    constraints.forEach(function(constraint) {
        switch (constraint) {
        case "String":
            if (!isString(value))
                issues.push({
                    warn: false,
                    msg: String.format("Field value must be a string"),
                    paths: [path]
                });
            break;
        case "Array":
            if (!isArray(value))
                issues.push({
                    warn: false,
                    msg: String.format("Field value must be an array"),
                    paths: [path]
                });
            break;
        case "non-empty":
            if (!notEmpty(value))
                issues.push({
                    warn: false,
                    msg: String.format("Field value can't be empty (e.g. \"\", [], {})"),
                    paths: [path]
                });
            break;
        case "absolute-path":
            if (!isAbsolutePath(value))
                issues.push({
                    warn: false,
                    msg: String.format("Field value must be an absolute file path"),
                    paths: [path]
                });
            break;
        default:
            return {
                ok: false,
                buggy: false,
                msg: String.format("unknown constraint \"{0}\". Avoid modifying the spec file",
                                   constraint),
                issues: []
            };
        }
    });

    if (showProgress) {
        if (issues.length > 0)
            console.log(" ", logSymbols.error, parse.joinPath(path));
        else
            console.log(" ", logSymbols.success, parse.joinPath(path));
    }

    return {
        ok: true,
        buggy: false,
        msg: "",
        issues: issues
    };
}

function isString(value) {
    return true;
}

function isArray(value) {
    return true;
}

function notEmpty(value) {
    return true;
}

function isAbsolutePath(value) {
    return true;
}

module.exports = {
    check: check
};

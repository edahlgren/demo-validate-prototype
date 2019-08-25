const fsPath = require('path');
const logSymbols = require('log-symbols');
const util = require('util');
const parse = require('./parse');

const EXTRA_METADATA = 0;
const REQUIRED_METADATA = 1;
const CHECKED_VALUE = 2;

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
        // msg: "Some of your metadata won't be used",
        var extra_meta = [];
        data.meta.unbound.forEach(function(path) {
            extra_meta.push(parse.joinPath(path));
        });
        issues.push({
            warn: true,
            type: EXTRA_METADATA,
            paths: extra_meta
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
            var required_meta = [];
            required.forEach(function(spec_path) {
                required_meta.push(parse.joinPath(parse.spec2meta(spec_path)));
            });
            issues.push({
                warn: false,
                type: REQUIRED_METADATA,
                paths: required_meta
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
                issues.push("Must be a string");
            break;
        case "Array":
            if (!isArray(value))
                issues.push("Must be an array");
            break;
        case "non-empty":
            if (!notEmpty(value))
                issues.push("Can't be empty (e.g. \"\", [], {})");
            break;
        case "absolute-path":
            if (!isAbsolutePath(value))
                issues.push("Must be an absolute file path");
            break;
        default:
            return {
                ok: false,
                buggy: false,
                msg: util.format("unknown constraint \"%s\". Avoid modifying the spec file",
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

    var out = [];
    if (issues.length > 0)
        out = [{
            warn: false,
            type: CHECKED_VALUE,
            path: parse.joinPath(path),
            value: util.inspect(value, false, 0),
            issues: issues
        }];
    
    return {
        ok: true,
        buggy: false,
        msg: "",
        issues: out
    };
}

function isString(value) {
    return (typeof value === 'string' || value instanceof String);
}

function isArray(value) {
    return Array.isArray(value);
}

function isObject(value) {
    return typeof value === 'object';
}

function notEmpty(value) {
    if (isString(value)) {
        return value !== "";
    }
    if (isArray(value)) {
        return value.length > 0;
    }
    if (isObject(value)) {
        if (value === null) {
            return false;
        }
        for (var prop in value) {
            if (value.hasOwnProperty(prop))
                return true;
        }
        return false;
    }

    // For other types that can be represented as YAML,
    // like numbers, we don't have a sense of emptiness,
    // so just say that the value is not empty.
    return true;
}

function isAbsolutePath(value) {
    try {
        return fsPath.isAbsolute(value);
    } catch (e) {
        return false;
    }
}

module.exports = {
    check: check,
    ISSUE_EXTRA_METADATA: EXTRA_METADATA,
    ISSUE_REQUIRED_METADATA: REQUIRED_METADATA,
    ISSUE_CHECKED_VALUE: CHECKED_VALUE
};

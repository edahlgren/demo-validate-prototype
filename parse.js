const logSymbols = require('log-symbols');
const traverse = require('traverse');
const util = require('util');

function parse(metaObj, specObj, showProgress) {
    // Data parsed from metaObj and specObj
    var data = {

        // Data about meta_file
        meta: {
            // YAML-based javascript obj
            obj: metaObj,
            // Paths to fields in obj
            paths: [],
            // Mapping of metadata paths to spec paths
            bound: new Map(),
            // Metadata that doesn't map to a spec
            unbound: []            
        },
        
        // Data about spec_file
        spec: {
            // YAML-based javascript obj
            obj: specObj,
            // Paths to fields in obj
            paths: [],
            // Mapping of spec paths to metadata paths
            bound: new Map(),
            // Specs that weren't used (but may be required)
            unbound: []
        },

        // Normalized metadata signatures
        // to spec signatures
        signatures: new Map()
    };

    
    /////////////////////////////////////////////////////////////////////////////////

    
    // Traverse objects to find paths
    try {
        data.meta.paths = traverse(data.meta.obj).paths();
    } catch (e) {
        return {
            ok: false,
            buggy: true,
            data: undefined,
            msg: util.format("failed to traverse data in %s", meta_file)
        };
    }
    try {
        data.spec.paths = traverse(data.spec.obj).paths();
    } catch (e) {
        return {
            ok: false,
            buggy: true,
            data: undefined,
            msg: util.format("failed to traverse data in %s", spec_file)
        };
    }
    if (showProgress)
        console.log(" ", logSymbols.success, "Traversed objects");

    
    /////////////////////////////////////////////////////////////////////////////////

    
    // Filter out paths that we won't need.
    data.meta.paths = data.meta.paths.filter(function(path) {
        return path.length > 0;
    });
    data.spec.paths = data.spec.paths.filter(function(path) {
        return !skipSpecPath(path);
    });
    if (showProgress)
        console.log(" ", logSymbols.success, "Found paths");

    
    /////////////////////////////////////////////////////////////////////////////////

    
    // Create metadata path signatures from the spec
    data.spec.paths.forEach(function(spec_path) {
        var meta_path = spec2meta(spec_path);
        var meta_signature = joinPath(meta_path);

        if (data.signatures.has(meta_signature)) {
            return {
                ok: false,
                buggy: true,
                data: undefined,
                msg: "can't have two normalized metadata signatures that map to the same spec"
            };
        }
        data.signatures.set(meta_signature, spec_path);
    });
    if (showProgress)
        console.log(" ", logSymbols.success, "Created metadata signatures");

    
    /////////////////////////////////////////////////////////////////////////////////

    
    // Bind metadata paths to spec paths and vice versa,
    // uncovering paths that are left over (unbound).
    data.meta.paths.forEach(function(meta_path) {
        var signature = joinPath(zeroPath(meta_path));

        var spec_path = data.signatures.get(signature);
        if (!spec_path) {
            data.meta.unbound.push(meta_path);
            return;
        }
        data.meta.bound.set(meta_path, spec_path);
        data.spec.bound.set(spec_path, meta_path);
    });
    data.spec.paths.forEach(function(spec_path) {
        var meta_path = data.spec.bound.get(spec_path);
        if (!meta_path)
            data.spec.unbound.push(spec_path);
    });
    if (showProgress)
        console.log(" ", logSymbols.success, "Bound metadata to specs");

    
    /////////////////////////////////////////////////////////////////////////////////

    
    // Parse was successful.
    return {
        ok: true,
        buggy: false,
        data: data,
        msg: ""
    };
}

function skipSpecPath(path) {
    // Skip the root.
    if (path.length == 0)
        return true;

    // Skip spec-only paths.
    var key = path[path.length - 1];
    if (key === "doc" || key === "content")
        return true;

    if (path.includes("constraints"))
        return true;

    return false;
}

function spec2meta(path) {
    var out = [];
    for (var i = 0; i < path.length; i++) {
        var key = path[i];
        if (key === "content")
            continue;
        out.push(key);
    }
    return out;
}

function joinPath(path) {
    var out = [];
    for (var i = 0; i < path.length; i++) {
        var key = path[i];
        if (/\d+/.test(key)) {
            out.push("[" + key + "]");
        } else {
            out.push("." + key);
        }
    }
    return out.join('');
}

function zeroPath(path) {
    var zeroed = [];
    for (var i = 0; i < path.length; i++) {
        if (/\d+/.test(path[i]))
            zeroed.push("0");
        else
            zeroed.push(path[i]);
    }
    return zeroed;
}

function _lookup(obj, path) {
    for (var i = 0; i < path.length; i++) {
        var key = path[i];
        if (!obj || !hasOwnProperty.call(obj, key)) {
            return {
                ok: false,
                value: undefined,
                path: path.slice(0, i+1)
            };
        }
        obj = obj[key];
    }
    return {
        ok: true,
        value: obj,
        path: path
    };
}

function lookup(data, path, hasConstraints) {
    var result = _lookup(data, path);
    if (!result.ok) {
        return {
            ok: false,
            value: undefined,
            bug: util.format("cannot find %s in spec file", joinPath(path))
        };
    }
    if (hasConstraints && !result.value.hasOwnProperty("constraints")) {
        return {
            ok: false,
            value: undefined,
            bug: util.format("%s has no defined constraints", joinPath(path))
        };
    }
    return {
        ok: true,
        value: result.value,
        bug: ""
    };
}

module.exports = {
    parse: parse,
    joinPath: joinPath,
    lookup: lookup
};

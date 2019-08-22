# About demo.yml

A demo.yml file contains the metadata of this demo, which is used to execute it, bulid it, and document its parts.

## Format

A demo.yml file is formatted as YAML, a compact, human-friendly data format. If you're unfamiliar with YAML, see the YAML to JSON reference below.

## Sections

    run        | metadata for 'demo run'
    io         | metadata for 'demo run --help'
    args       |
               |
    build      | metadata for 'demo build'
               |  
    datasets   | metadata for 'demo docs'
    repos      |
    papers     |

## Constraints

  In each section, metadata fields are documented with constraints. For
  example, a field requires a value of a specific type:

    String     | A sequence of characters like "cat"
               | Needs to be quoted only if it starts with
               | a dash ("-")
    Number     | An numerical value, can be 64-bit
    Array      | An array of values like [item1, item2...]
               | In YAML, array items are indented and are
               | preceeded by a dash
    Object     | A structure containing fields and values.
               | In YAML fields are intended

  Other constraints:

    non-empty  | Can't be empty
    contains   | For Arrays, mentions what type it should contain
    file       | A file name like "file.json"
    absolute   | An absolute file name like "/root/file.json"

  If you change the data in this file, you can check that all constraints
  are met by running this command from inside the demo:

    $ demo validate

## YAML to JSON reference 

   Objects

     YAML            JSON
     ----            ----

     feline: 1       { "feline": 1 }

     cat:            "cat": { "feline": 1 }
       feline: 1

   Arrays

     YAML            JSON
     ----            ----
     key:            { "key": [ item1, item2 ] }
       - item1
       - item2

   Strings

     YAML            JSON
     ----            ----
     key: string     { "key": "string" }

     key: "-string"  { "key": "-string" }

     key: >-         { "key": "This is a really long..." }
       This is a
       really long
       string that
       doesn't have
       line breaks.

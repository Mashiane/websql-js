// websql.js
//
// (c) 2012 Stepan Riha
//
// Module that wraps asynchronous WebSQL calls with jQuery's Deferred promises.
//
// Promises are **resolved** with the database as the first value.
// Some methods inclode a second value
// (`getTables tables[]`, `rsCallback result`, `rowCallback result` ).
//
// Promises are **rejected** with an error object that may contain one or more of the following:
//
// * `exception`: Exception that was thrown
// * `sqlError`: Error returned by WebSQL
// * `sql`: statement that was executing
// * `message`: Describing what failed

define(["trace"], function(trace) {
    
    var db;
    var ERROR = 1;
    var DEBUG = 2;

    var verbosity = DEBUG;

    initialize();

    // Exported functions
    // ------------------
    // 
    // * `openDatabase(name, version, displayName, estimatedSize)`
    // * `changeVersion(db, oldVersion, newVersion, xactCallback)`
    // * `getTables(db)`: `[{ name, type, sql }]`
    // * `emptyDatabase(db)`
    // * `transaction(db, xactCallback)`
    // * `readTransaction(db, xactCallback)`
    // * `execute(db, sqlStatement(s), args(s), rsCallback)`: `rsCallback()` or `resultSet`
    // * `select(db, sqlStatement, args, rsCallback)`: `rsCallback()` or `resultSet`
    // * `selectRow(db, sqlStatement, args, rowCallback)`: `rowCallback()` or `row`
    // * `logVerbosity(level)`: `level`
    // * `ERROR`
    // * `DEBUG`

    return  {
        logVerbosity: logVerbosity,

        openDatabase: openDatabase,
        changeVersion: changeVersion,
        getTables: getTables,
        emptyDatabase: emptyDatabase,

        transaction: transaction,
        readTransaction: readTransaction,

        execute: execute,
        select: select,
        selectRow: selectRow,

        logVerbosity: logVerbosity,
        ERROR: ERROR,
        DEBUG: DEBUG
    };
    
    // ### openDatabase(name, version, displayName, estimatedSize)
    //
    // Calls window.openDatabase()
    //
    // Returns: deferred promise that resolves with the opened database
    //
    // Usage:
    //
    //      websql.openDatabase("test", "Test Database", 2 * 1024 * 1024))
    //          .then(function(db) {...});
    //
    function openDatabase(name, version, displayName, estimatedSize) {
        log(DEBUG, "openDatabase", name, version, displayName, estimatedSize);

        var dfd = Deferred();
        try {
            if(!window.openDatabase) {
                log(ERROR, "WebSQL not implemented");
                dfd.reject({
                    message: "WebSQL not implemented"
                });
            } else {
                var db = window.openDatabase(name, version, displayName, estimatedSize,
                    function(db) {
                        log(DEBUG, "SUCCESS openDatabase", name);
                        dfd.resolve(db);
                    },
                    function(error) {
                        dfd.reject({
                            sqlError: error
                        });
                    }
                );
                if(db) {
                    dfd.resolve(db);
                }
            }
        } catch (err) {
            log(ERROR, "Failed to open database " + name);
            dfd.reject({
                message: "Failed to open database " + name,
                exception: err
            });
        }
        return dfd.promise();
    }
    
    // ### changeVersion(db, oldVersion, newVersion, xactCallback)
    //
    // Calls db.changeVersion(oldVersion, newVersion, xactCallback).
    //
    // Returns: deferred promise that resolves with the changed database
    //
    // Usage:
    //
    //      websql.changeVersion(db, "1", "2",
    //              function(xact) {
    //                  xact.executeSQL(...);
    //              }
    //      ).then(function(db) {...});
    //
    function changeVersion(db, oldVersion, newVersion, xactCallback) {
        log(DEBUG, "openDatabase", db, oldVersion, newVersion, xactCallback);

        var dfd = Deferred();
        try {
            if(!isDatabase(db)) {
                rejectError(dfd, "Database not specified (db='" + db + "')");
            } else {
                db.changeVersion(oldVersion, newVersion, xactCallback,
                    function(error) {
                        log(ERROR, error);
                        dfd.reject({
                            message: "Failed to change version",
                            sqlError: error
                        });
                    },
                    function() {
                        log(DEBUG, "SUCCESS changeVersion");
                        dfd.resolve(db);
                    }
                );
            }
        } catch (err) {
            log(ERROR, err);
            dfd.reject({
                message: "Failed changeVersion(db, '" + oldVersion + "', '" + newVersion + "'')",
                exception: err
            });
        }
        return dfd.promise();
    }

    // ### getTables(db)
    //
    // Queries the sqlite_master table for user tables
    //
    // Returns: deferred promise that resolved with an array of table information records
    //
    // Usage:
    //
    //      websql.getTables(db)
    //          .then(function(tables) {
    //          for(var i = 0; i < tables.length; i++) {
    //              var name = tables[i].name;
    //              var sql = tables[i].sql;
    //              ...
    //          }
    //      });
    //
    function getTables(db) {

        var sql = "SELECT name, type, sql FROM sqlite_master " +
                    "WHERE type in ('table') AND name NOT LIKE '?_?_%' ESCAPE '?'";

        return select(db, sql, function(rs) {
            var tables = [];
            var rows = rs.rows;
            for(var i = 0; i < rows.length; i++) {
                tables.push(rows.item(i));
            }
            return tables;
        });
    }

    // ### emptyDatabase(db)
    //
    // Drops all the tables in the database.
    //
    // Returns: deferred promise that resolved with the emptied database
    //
    // Usage:
    //
    //      websql.emptyDatabase(db)
    //          .then(function(db) {...});
    //
    function emptyDatabase(db) {
        return changeVersion(db, db.version, "", function(xact) {
            var sql = "SELECT name FROM sqlite_master " +
                        "WHERE type in ('table') AND name NOT LIKE '?_?_%' ESCAPE '?'";
            xact.executeSql(sql, [], function(xact, rs) {
                var rows = rs.rows;
                for(var i = 0; i < rows.length; i++) {
                    var sql = "DROP TABLE " + rows.item(i).name;
                    xact.executeSql(sql);
                }
            })   
        });
    }

    // ### transaction(db, xactCallback)
    //
    // Calls xactCallback(xact) from within a database transaction
    //
    // Returns: deferred promise that resolved with the database
    //
    // Usage:
    //
    //      websql.transaction(db, 
    //              function(xact) {
    //                  xact.executeSQL(...);
    //              }
    //      ).then(function(db) {...});
    //
    // More usage:
    //
    //      var addressId;
    //      var personId;
    //
    //      function insertPerson(xact) {
    //          return xact.executeSql(
    //              "INSERT INTO person ...", [...],
    //              function(xact, rs) {
    //                  personId = rs.insertId;
    //                  insertAddress(xact, personId);
    //              }
    //          )
    //      }
    //
    //      function insertAddress(xact, personId) {
    //          return websql.executeSql(xact,
    //              "INSERT INTO address (person, ...) VALUES (?, ...)",
    //              [personId, ...],
    //              function(xact, rs) {
    //                  addressId = rs.insertId;
    //              }
    //          )
    //      }
    //
    //      websql.transaction(db, 
    //              function(xact) {
    //                  insertPerson(xact);
    //              }
    //      ).then(function(db) {
    //          alert("Created person " + personId +
    //                  " with address " + addressId);
    //      });
    //
    function transaction(db, xactCallback) {
        var dfd = Deferred();
        log(DEBUG, "transaction: in");

        try {
            if(!isDatabase(db)) {
                rejectError(dfd, "Database not specified (db='" + db + "')");
            } else {
                db.transaction(function(xact) {
                        xactCallback(xact);
                    },
                    function(error) {
                        var reason = {
                            message: "Failed executing transaction",
                            sqlError: error                     
                        };
                        log(ERROR, "transaction: error", reason);
                        dfd.reject(reason);
                        log(DEBUG, "transaction: rejected");
                    },
                    function() {
                        log(DEBUG, "transaction: resolving");
                        dfd.resolve(db);
                        log(DEBUG, "transaction: resolved");
                    }
                );
            }
        } catch (exception) {
            var reason = {
                message: "Failed calling transaction",
                exception: exception
            };
            log(ERROR, "transaction: exception", reason);
            dfd.reject(reason);
            log(DEBUG, "transaction: rejected");
        }
        log(DEBUG, "transaction: out");
        return dfd.promise();
    }

    // ### readTransaction(db, xactCallback)
    //
    // Calls xactCallback(xact) from within a database read transaction
    //
    // Returns: deferred promise that resolved with the database
    //
    // Usage:
    //
    //      websql.readTransaction(db,
    //              function(xact) {
    //                  xact.executeSQL(...);
    //              }
    //      ).then(function(db) {...});
    //
    function readTransaction(db, xactCallback) {
        var dfd = Deferred();
        log(DEBUG, "readTransaction: in");

        try {
            if(!isDatabase(db)) {
                rejectError(dfd, "Database not specified (db='" + db + "')");
            } else {
                db.readTransaction(function(xact) {
                        xactCallback(xact);
                    },
                    function(error) {
                        var reason = {
                            message: "Failed executing read transaction",
                            sqlError: error                     
                        };
                        log(ERROR, "readTransaction: error", reason);
                        dfd.reject(reason);
                        log(DEBUG, "readTransaction: rejected");
                    },
                    function() {
                        log(DEBUG, "readTransaction: resolving");
                        dfd.resolve(db);
                        log(DEBUG, "readTransaction: resolved");
                    }
                );
            }
        } catch (exception) {
            var reason = {
                message: "Failed calling readTransaction",
                exception: exception
            };
            log(ERROR, "readTransaction: exception", reason);
            dfd.reject(reason);
            log(DEBUG, "readTransaction: rejected");
        }
        log(DEBUG, "readTransaction: out");
        return dfd.promise();
    }

    // ### execute(db, sqlStatement(s), _args(s)_, _rsCallback_)
    //
    // Convenience method for executing a transaction with a one or more `sqlStatement`
    // with the specified `args`, calling the `rsCallback` with the result set(s).
    //
    // The `args` and `rsCallback` are optional.
    //
    // * Passing a _single_ `sqlStatement` with `args` that are an _array of arrays_,
    // the statement is executed with each row in the `args`.
    // * Passing an array of `{ sql, args}` objects to `sqlStatement`
    // executes the `sql` in each row with the row's `args` or the parameter `args`.
    //
    // Returns: deferred promise that resolves with the database and `rsCallback` result(s)
    // or the resultSet(s), if no `rsCallback` specified.
    //
    // Usage:
    //
    //      websql.execute(db,
    //                  "INSERT INTO person (first, last) VALUES (?, ?)",
    //                  ["John", "Doe"],
    //                  function(rs) {
    //                      console.log("Inserted person", rs.insertId);
    //                      return rs.insertId;
    //                  }
    //      ).then(function(db, result) {...});
    //
    // Basic usage:
    //
    //      websql.execute(db, "DELETE FROM person")
    //          .then(function(db, resultSet) {...});
    //
    // Other Usage: (single `sqlStatement` with multiple sets of `args`)
    //
    //      websql.execute(db,
    //                  "INSERT INTO person (first, last) VALUES (?, ?)",
    //                  [
    //                      ["John", "Doe"],
    //                      ["Jane", "Doe"]
    //                  ],
    //                  function(rs) {
    //                      console.log("Inserted person", rs.insertId);
    //                      return rs.insertId;
    //                  }
    //      ).then(function(db, personId1, personId2) {...});
    //
    // Other Usage: (multiple `sqlStatement` with multiple sets of `args`)
    //
    //      websql.execute(db,
    //                  [{
    //                      sql: "UPDATE person SET (first=?, last=?) WHERE id=?",
    //                      args: ["Robert", "Smith", 23]
    //                  }, {
    //                      sql: "UPDATE address SET (street=?, city=?, zip=?) WHERE id=?",
    //                      args: ["Sesame St.", "Austin", "78758", 45]
    //
    //                  }],
    //                  function(rs) {
    //                      console.log("Updated object: ", rs.rowsAffected);
    //                      return rs.rowsAffected;
    //                  }
    //      ).then(function(db, numPersons, numAddresses) {...});
    //
    function execute(db, sqlStatement, args, rsCallback) {
        var results = [];
        var ctx = this;
        if(typeof(arguments[2]) === "function") {
            rsCallback = arguments[2];
            args = undefined;
        }

        function execCommand(xact, sql, args) {
            xact.executeSql(sqlStatement, args || [], function(xact, rs) {
                results.push(rsCallback ? rsCallback(rs) : rs);
            });                            
        }

        return transaction(db, function(xact) {
            if(isArray(sqlStatement)) {
                for(var i = 0; i < sqlStatement.length; i++) {
                    var cmnd = sqlStatement[i];
                    execCommand(xact, cmnd.sql, isUndefined(cmnd.args)
                                            ? args : cmnd.args);
                }
            } else {
                var argSets = isArray(args) && isArray(args[0])
                        ? args : [args];
                for(var i = 0; i < argSets.length; i++) {
                    execCommand(xact, sqlStatement, argSets[i]);
                }
            }
        }).pipe(function(db) {
            results.unshift(db);
            return Deferred().resolveWith(ctx, results);
        }, function(err) {
            err.sql = sqlStatement
        })
    }

    // ### select(db, sqlStatement, _args_, _rsCallback_)
    //
    // Convenience method for executing a readTransaction with a single `sqlStatement`
    // with the specified `args`.
    // The `rsCallback` is called with the queried result set.
    //
    // The `args` and `rsCallback` are optional.
    //
    // Returns: deferred promise that resolves with the database and `rsCallback` result
    // or the resultSet, if no `rsCallback` specified.
    //
    // Usage:
    //
    //      websql.select(db,
    //                  "SELECT * FROM person WHERE first = ?",
    //                  ["Bob"],
    //                  function(rs) {
    //                      var rows = rs.rows;
    //                      for(var i = 0; i < rows.length; i++) {
    //                          ...
    //                      }
    //                      return result;
    //                  }
    //      ).then(function(db, result) {...});
    //
    // Other usage:
    //
    //      websql.select(db,
    //                  "SELECT * FROM person WHERE first = ?",
    //                  ["Bob"]
    //      ).then(function(db, resultSet) {...});
    //
    function select(db, sqlStatement, args, rsCallback) {
        var result;
        if(typeof(arguments[2]) === "function") {
            rsCallback = arguments[2];
            args = undefined;
        }
        return readTransaction(db, function(xact) {
            xact.executeSql(sqlStatement, args, function(xact, rs) {
                result = rsCallback ? rsCallback(rs) : rs;
            });
        }).pipe(function(db) {
            return Deferred().resolve(db, result);
        }, function(err) {
            err.sql = sqlStatement
        })
    }

    // ### selectRow(db, sqlStatement, _args_, _rowCallback_)
    //
    // Convenience method for executing a readTransaction with a single `sqlStatement`
    // that's expected to return a single row.
    // The specified `rowCallback` is called with the *first* row in the resultset
    // or with `undefined` if resolutSet contains no rows.
    //
    // The `args` and `rowCallback` are optional.
    //
    // Returns: deferred promise that resolves with the database and `rowCallback` result
    // or the row, if no `rowCallback` specified.
    //
    // Usage:
    //
    //      websql.selectRow(db,
    //                  "SELECT * FROM person WHERE id = ?",
    //                  [123],
    //                  function(row) {
    //                      if(!row) {
    //                          // person not found
    //                          return;
    //                      }
    //                      var login = row.login;
    //                      ...
    //                      return result;
    //                  }
    //      ).then(function(db, result) {...});
    //
    // Other Usage:
    //
    //      websql.selectRow(db,
    //                  "SELECT * FROM person WHERE id = ?",
    //                  [123]
    //      ).then(function(db, row) {...});
    //
    function selectRow(db, sqlStatement, args, rowCallback) {
        if(typeof(arguments[2]) === "function") {
            rowCallback = arguments[2];
            args = undefined;
        }
        return select(db, sqlStatement, args, function(rs) {
            var row;
            if(rs.rows.length >= 1) {
                row = rs.rows.item(0);
            }
            return rowCallback ? rowCallback(row) : row;
        })
    }

    // ### logVerbosity(level)
    //
    // Sets or returns the log verbosity level
    //
    // Usage:
    //
    //      alert(websql.logVerbosity());
    //      websql.logVerbosity(websql.DEBUG);
    //
    function logVerbosity(level) {
        if(level !== unknown) {
            verbosity = level;
        }
        return verbosity;
    }

    // Internal Functions
    // ------------------

    // ### Deferred()
    //
    // Create a Deferred object
    //
    function Deferred() {
        return jQuery.Deferred();
    }

    // ### log(level, msg1, msg2, ...)
    //
    // Log statement unless level > verbosity
    //
    // Usage:
    //
    //      log(DEBUG, "Calling function", functionName);
    //      log(ERROR, "Something horrible happened:", error);
    //
    function log(level) {
        if(level <= verbosity) {
            var args = Array.prototype.slice.call(arguments, 1);
            args.unshift("WebSQL:");
            trace.text(args, "color: purple");
        }
    }

    function rejectError(dfd, error) {
        if(isString(error)) {
            error = { message : error };
        }

        log(ERROR, "ERROR: " + error.message || error.exception || error.sqlError);
        return dfd.reject(error);
    }

    function toString(obj) {
        return Object.prototype.toString.call(obj);  
    }

    function isString(fn) {
        return toString(fn) === '[object String]';
    }

    function isDatabase(db) {
        return toString(db) === '[object Database]';
    }
    
    function isFunction(fn) {
        return toString(fn) === '[object Function]';
    }

    function isUndefined(obj) {
        return obj === void 0;
    }

    var isArray;

    // ### initialize()
    //
    function initialize() {
        isArray = Array.isArray || function(obj) {
            return toString(obj) === '[object Array]';
        };
    }

});
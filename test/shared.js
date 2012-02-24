define(["websql", "jquery"], function(websql, $) {
	
	var db_name = "websql_test2";
	var nodb = !window.openDatabase;

	function console_error() {
		console.error(arguments);
	}
			
	function reset_db() {
		if(nodb)
			return $.Deferred().fail("no db");
		
		var db = window.openDatabase(db_name, "", db_name, 2 * 1024 * 1024);

		if(db.version) {
			return db.changeVersion(db.version, "", function(xact) {
				xact.executeSql("SELECT name FROM sqlite_master WHERE name LIKE 'test_%'", [],
					function tables(xact, rs) {
						var rows = rs.rows;
						for(var i = 0; i < rows.length; i++) {
							xact.executeSql("DROP TABLE " + rows.item(i).name);
						}
					})
			}, console_error, function() {
			});
		} else {
			return $.Deferred().resolve(db);
		}
	}

	function unexpected_success() {
		ok(false, "unexpected success");
		return $.Deferred().resolve(exports.db);
	}

	function unexpected_error(error) {
		ok(false, "unexpected error: " + JSON.stringify(error));
		return $.Deferred().resolve(exports.db);
	}

	// stop synchronous execution, open db and set version to 1.0
	function begin_test(initialVersion) {
		stop();

		// Open db
		var promise = websql.openDatabase(db_name)
				.then(function(db) {
					equal(db.version, "", "db.version=''");
					exports.db = db;
				});

		// Set to initialVersion
		if(initialVersion) {
			promise = promise.pipe(function(db) {
				return websql.changeVersion(db, "", "1.0");
			});
		}

		return promise;
	}

	// check for unexpected errors, reset db and restart synchronous execution
	function finish_test(promise) {
		return promise.pipe(null, unexpected_error)
			.pipe(reset_db)
			.always(start);
	}

	var exports = {
		nodb: nodb,
		reset_db : reset_db,
		db_name: db_name,
		unexpected_error: unexpected_error,
		unexpected_success: unexpected_success,
		begin_test: begin_test,
		finish_test: finish_test
	};

	return exports;
})
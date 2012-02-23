define(["websql", "shared"], function(websql, shared) {
	
	asyncTest("transaction", 15, function transaction() {

		var ringoId;

		var promise = shared.begin_test("1.0");

		promise = promise
					.pipe(setupTable)
						.pipe(null, shared.unexpected_error)
					.pipe(testSelectSql)
						.pipe(null, shared.unexpected_error)
					.pipe(executeUpdateSql)
						.pipe(null, shared.unexpected_error)
					.pipe(executeBogusSql)
						.pipe(shared.unexpected_success, validateBogusSql)
					.pipe(executeExceptionCallback)
						.pipe(shared.unexpected_success, validateExceptionCallback)
					;

		shared.finish_test(promise);

		// Create table test_person with 4 records
		function setupTable(db) {
			return websql.transaction(db, function(xact) {
				xact.executeSql("CREATE TABLE test_person (id INTEGER PRIMARY KEY, first, last)", [], function(xact, rs) {
					ok(true, "CREATE TABLE");
				});
				xact.executeSql("INSERT INTO test_person (first, last) VALUES (?, ?)",
					["John", "Lennon"]);
				xact.executeSql("INSERT INTO test_person (first, last) VALUES (?, ?)",
					["George", "Harrison"]);
				xact.executeSql("INSERT INTO test_person (first, last) VALUES (?, ?)",
					["Paul", "McCartney"]);
				xact.executeSql("INSERT INTO test_person (first, last) VALUES (?, ?)",
					["Ringo", "Starr"], function(xact, rs) {
						ok(true, "INSERT");
						ringoId = rs.insertId;
						ok(ringoId, "rs.insertId = " + ringoId);
					});
			});
		};

		// Test selecting existing row
		function testSelectSql(db) {
			return websql.transaction(db, function(xact) {
				xact.executeSql("SELECT id, first, last FROM test_person WHERE id = ?",
					[ringoId], function(xact, rs) {
						var rows = rs.rows;
						equal(rows.length, 1, "SelectSql rows.length");
						if(!rows.length)
							return;
						var row = rows.item(0);
						var expected = {
							id: ringoId,
							first: "Ringo",
							last: "Starr"
						};
						deepEqual(row, expected, "SelectSql row");
					});
			});
		}

		// Test executing SQL that tries to update data
		function executeUpdateSql(db) {
			return websql.transaction(db, function(xact) {
				xact.executeSql("UPDATE test_person SET last = ? WHERE id = ?", ["StarrFish", ringoId],
					function(xact, rs) {
						equal(rs.rowsAffected, 1, "UpdateSql rows.rowsAffected");
					});
			});
		}
		
		// Test executing invalid SQL
		function executeBogusSql(db) {
			return websql.transaction(db, function(xact) {
				xact.executeSql("xxx SELECT id, first, last FROM test_person WHERE id = ?");
			});
		}

		// Error should contain a sqlError
		function validateBogusSql(err) {
			ok(err, "BogusSql err");
			ok(err.message, "BogusSql err.message: " + err.message);
			ok(err.sqlError, "BogusSql err.sqlError: " + err.sqlError);
			ok(!err.exception, "BogusSql err.exception: " + err.exception);
			return $.Deferred().resolve(shared.db);
		}
		
		// Test throwing exception in xact callback
		function executeExceptionCallback(db) {
			return websql.transaction(db, function(xact) {
				throw "Failed callback";
			});
		}

		// Error should contain an exception
		function validateExceptionCallback(err) {
			ok(err, "Exception err");
			ok(err.message, "Exception err.message: " + err.message);
			ok(!err.sqlError, "Exception err.sqlError: " + err.sqlError);
			ok(err.exception, "Exception err.exception: " + err.exception);
			return $.Deferred().resolve(shared.db);
		}
	});

});
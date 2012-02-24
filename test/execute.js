define(["websql", "shared"], function(websql, shared) {
	
	asyncTest("execute", 19, function execute() {

		var johnId, georgeId, paulId, ringoId;

		var promise = shared.begin_test("1.0");

		promise = promise
					.pipe(setupTable)
						.pipe(null, shared.unexpected_error)
					.pipe(insertBasic)
						.pipe(validateBasic, shared.unexpected_error)
					.pipe(insertParams)
						.pipe(validateParams, shared.unexpected_error)
					.pipe(insertMultipleArgs)
						.pipe(validateMultipleArgs, shared.unexpected_error)
					.pipe(updateMultipleStatements)
						.pipe(validateResults, shared.unexpected_error)
					;

		shared.finish_test(promise);

		// Create table test_person 
		function setupTable(db) {
			return websql.execute(db, "CREATE TABLE test_person (id INTEGER PRIMARY KEY, first, last)");
		};

		// Insert using basic 
		function insertBasic(db) {
			return websql.execute(db, "INSERT INTO test_person (first, last) VALUES ('John', 'Lennon')",
				function(rs) {
					equal(rs.insertId, 1, "insertBasic: rs.insertId");
					return johnId = rs.insertId;
				});
		};

		function validateBasic(db, id) {
			equal(johnId, id, "johnId");
			return db;
		}

		// Insert using params 
		function insertParams(db) {
			return websql.execute(db, "INSERT INTO test_person (first, last) VALUES (?, ?)",
				["George", "Harrison"],
				function(rs) {
					equal(rs.insertId, 2, "insertBasic: rs.insertParams");
					return georgeId = rs.insertId;
				});
		};

		function validateParams(db, id) {
			equal(georgeId, id, "georgeId");
			return db;
		}

		// Insert using single statement with multiple argument sets 
		function insertMultipleArgs(db) {
			return websql.execute(db, "INSERT INTO test_person (first, last) VALUES (?, ?)",
				[
					["Paul", "McCartney"],
					["Ringo", "Starr"]
				],
				function(rs) {
					return rs.insertId;
				});
		};

		function validateMultipleArgs(db, id1, id2) {
			paulId = id1;
			ringoId = id2;
			ok(paulId, "paulId");
			ok(ringoId, "ringoId");
			notEqual(paulId, ringoId, "paulId != ringoId");
			return db;
		}

		// Update using an array of command objects
		function updateMultipleStatements(db) {
			return websql.execute(db,
				[
					{
						sql: "UPDATE test_person SET first = 'JOHN' WHERE id = ?",
						args: [ johnId ]
					},
					{
						sql: "UPDATE test_person SET first = ? WHERE first = ?",
						args: [ "GEORGE", "George" ]
					},
				], function(rs) {
					equal(rs.rowsAffected, 1, "updateMultipleStatements");
					return rs;
				})
		}

		function validateResults(db) {
			return websql.execute(db, "SELECT * FROM test_person", function(rs) {
				var rows = rs.rows;
				equal(rows.length, 4, "rows.length");
				var hash = {};
				for(var i = 0; i < rows.length; i++) {
					var row = rows.item(i);
					hash[row.id] = row;
				}

				ok(hash[johnId], "hash[johnId]");
				equal(hash[johnId].first, "JOHN", "hash[johnId].first");
				ok(hash[georgeId], "hash[georgeId]");
				equal(hash[georgeId].first, "GEORGE", "hash[georgeId].first");
				ok(hash[paulId], "hash[paulId]");
				equal(hash[paulId].first, "Paul", "hash[paulId].first");
				ok(hash[ringoId], "hash[ringoId]");
				equal(hash[ringoId].first, "Ringo", "hash[ringoId].first");
			})
		}

	});

});
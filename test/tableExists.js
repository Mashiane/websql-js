define(["websql", "shared"], function(websql, shared) {
	
	asyncTest("tableExists", 6, function tableExists() {

		var tables = ["test_existing", "test_a", "test_b", "test_c", "test_supercalifragilisticexpialidocious"];

		var promise = shared.begin_test();

		promise = promise
					.pipe(createTables, shared.unexpected_error)
					.pipe(testExistingTable, shared.unexpected_error)
					.pipe(testMissingTable, shared.unexpected_error);

		shared.finish_test(promise);

		// Create some tables
		function createTables(db) {
			return websql.changeVersion(db, "", "1.0", function(xact) {
				for(var i = 0; i < tables.length; i++) {
					xact.executeSql(sql(tables[i]));
				}
			});
		};

		function testExistingTable(db) {
			return websql.tableExists(db, "test_existing")
					.done(function(db, table) {
						ok(table, "test_existing");
						equal(table.name, "test_existing", "test_existing.name");
						equal(table.type, "table", "test_existing.type");
						equal(table.sql, sql('test_existing'), "sql('test_existing')");
					});
		}

		function testMissingTable(db) {
			return websql.tableExists(db, "test_missing")
					.done(function(db, table) {
						ok(!table, "test_missing");
					});
		}
		
		function sql(table) {
			return "CREATE TABLE " + table + " (id, name)";
		}

	});

});
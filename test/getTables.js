define(["websql", "shared"], function(websql, shared) {
	
	asyncTest("getTables", 2, function getTables() {

		var tables = ["test_z", "test_a", "test_b", "test_c", "test_supercalifragilisticexpialidocious"];

		var promise = shared.begin_test();

		promise = promise
					.pipe(createTables)
					.pipe(verifyTables, shared.unexpected_error);

		shared.finish_test(promise);

		// Create some tables
		function createTables(db) {
			return websql.changeVersion(db, "", "1.0", function(xact) {
				for(var i = 0; i < tables.length; i++) {
					xact.executeSql("CREATE TABLE " + tables[i] + " (id, name)");
				}
			});
		};

		function verifyTables(db) {
			return websql.getTables(db)
					.done(function(db, ts) {
						for(var i = 0; i < ts.length; i++)
							ts[i] = ts[i].name;
						tables.sort();
						ts.sort();
						deepEqual(ts, tables, "getTables");
					});
		}

	});

});
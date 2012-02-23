define(["websql", "shared"], function(websql, shared) {
	
	test("openDatabase", 4, function() {
	
		module("Valid name");

		var promise = websql.openDatabase(test.db_name);

		ok(promise, "websql.openDatabase(test.db_name)");
		equal(typeof(promise.then), "function", "typeof(promise.then)");

		promise.then(function(db) {
			ok(db, "db", "opened db");
			equal(db.name, test.db_name);
		}, function(err) {
			ok(false, err);
		});

	});

});
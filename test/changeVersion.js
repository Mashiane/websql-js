define(["websql", "shared"], function(websql, shared) {
	
	asyncTest("changeVersion", 9, function changeVersion() {

		stop();
	
		var theDb;

		var promise = websql.openDatabase(shared.db_name)
				.then(function(db) {
					theDb = db;
					equal(db.version, "", "db.version=''");
				});

		// Change from '' => '1.0'
		promise = promise.pipe(function(db) {
			return websql.changeVersion(db, "", "1.0");
		});

		ok(promise, "websql.changeVersion(db, '', 1.0') => promise");
		equal("function", typeof(promise.then), "typeof(promise.then)");

		promise.then(function(db) {
			equal(db.version, "1.0", "db.version=1.0");
		}, function(err) {
			ok(false, err);
		}).always(function() {
		});

		// Change from '1.0' => '2.0' with DDL update
		promise = promise.pipe(function(db) {
			return websql.changeVersion(db, "1.0", "2.0", function(xact) {
				xact.executeSql("CREATE TABLE test_a (id, name)");
			});
		});

		promise.then(function(db) {
			equal(db.version, "2.0", "db.version=2.0");
		}, function(err) {
			ok(false, err);
		});

		promise.pipe(function(db) {
			return websql.tableExists(db, "test_a")
				.then(function(db, exists) {
					ok(exists, "test_a exists");
				});
		});

		// Invalid change from '2.0' => '3.0'
		promise = promise.pipe(function(db) {
			return websql.changeVersion(db, "1.0", "2.0", function(xact) {
				xact.executeSql("CREATE TABLE test_b (id, name)");
				xact.executeSql("bogus sql");
			});
		});

		promise.then(function(db) {
			ok(false, err);
		}, function(err) {
			equal(theDb.version, "2.0", "db.version=2.0 (unchanged)");

		});

		promise = promise.pipe(null, function() { return $.Deferred().resolve(theDb); });

		promise = promise.pipe(function(db) {
			return websql.tableExists(db, "test_a")
		}).then(function(db, exists) {
			ok(exists, "test_a exists (still)");
		});

		promise = promise.pipe(function(db) {
			return websql.tableExists(theDb, "test_b");
		}).then(function(db, exists) {
			ok(!exists, "test_b does not exist");
		});

		promise.pipe(shared.reset_db).always(function() {
			start();
		});
	});

});
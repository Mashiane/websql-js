define(["websql", "shared"], function(websql, shared) {
	
	asyncTest("select", 1, function select() {

		var johnId, georgeId;

		var promise = shared.begin_test("1.0");

		// TODO: select tests

		shared.finish_test(promise);

	});

});
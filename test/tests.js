require.config({
	paths: {
		websql: "../websql",
		jquery: "vendor/jquery.min"
	}
})

define([
	"public",
	"openDatabase",
	"changeVersion",
	"getTables",
	"tableExists",
	"transaction",
	"readTransaction",
	"execute",

	], function() {

	QUnit.start(); //Tests loaded, run tests

});
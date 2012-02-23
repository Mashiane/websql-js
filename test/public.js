define(["websql"], function(websql) {

    test("Public Exports", function() {

        ok(websql, "websql");

        module("Methods");

        equal("function", typeof(websql.logVerbosity), "typeof(websql.logVerbosity)");
        equal("function", typeof(websql.openDatabase), "typeof(websql.openDatabase)");
        equal("function", typeof(websql.changeVersion), "typeof(websql.changeVersion)");
        equal("function", typeof(websql.getTables), "typeof(websql.getTables)");
        equal("function", typeof(websql.tableExists), "typeof(websql.tableExists)");
        equal("function", typeof(websql.emptyDatabase), "typeof(websql.emptyDatabase)");
        equal("function", typeof(websql.transaction), "typeof(websql.transaction)");
        equal("function", typeof(websql.readTransaction), "typeof(websql.readTransaction)");
        equal("function", typeof(websql.execute), "typeof(websql.execute)");
        equal("function", typeof(websql.select), "typeof(websql.select)");
        equal("function", typeof(websql.selectRow), "typeof(websql.selectRow)");
        equal("function", typeof(websql.setConsole), "typeof(websql.setConsole)");

        module("Constants");

        equal("number", typeof(websql.ERROR), "typeof(websql.ERROR)");
        equal("number", typeof(websql.DEBUG), "typeof(websql.DEBUG)");

    });
});
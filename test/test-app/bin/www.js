#!/usr/bin/env node
/* eslint no-var: "off" */
// get application module (check if process contains --require @babel/register plugin)
function requireAppModule() {
    var index = process.execArgv.indexOf('@babel/register');
    if (index>0 && process.execArgv[index-1] == '--require') {
        return require('../server/server');
    }
    return require('../dist/server/server');
}
var app = requireAppModule();
// get binding port
var port = parseInt(process.env.PORT, 10) || 3000;
// get binding address
var ip = process.env.IP || '0.0.0.0';
// start listening
app.start({
    port: port,
    ip: ip
});
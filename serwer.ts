import { promisify } from "util";

var fs = require('fs');
var express = require('express');
var app = express();

app.use(express.static('public'));
app.use(express.json());

let port = 8090;

const sqlite3 = require('sqlite3').verbose();
var fs = require('fs');

let db;

function connect() {
    // open database in memory
    db = new sqlite3.Database('./db/pages.db', (err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Connected to the SQlite database.');
    });
}

function close() {
    // close the database connection
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Closed the database connection.');
    });
}

function init() {
    // it should be run only once to set up a new database not on each startup
    // let superCommand = fs.readFileSync('db/init.sql').toString();
    let superCommand = "DROP TABLE IF EXISTS Files; CREATE TABLE Files ( Id INTEGER NOT NULL, Name TEXT NOT NULL, Ct INTEGER NOT NULL, PRIMARY KEY (Id) );";
    db.exec(superCommand + " INSERT INTO Files(Name, Ct) VALUES('ABC', 2);", err => {
        if (err) throw err;
        else console.log("init OK");
    });
}

function getAll(callback) {
    let str = "SELECT Name AS Nazwa, Ct AS ilość_odczytów FROM Files";
    console.log(str);
    connect();
    db.all(str, [], (err, rows) => {
        if(!err) console.log(rows.length + ' rows retrieved');
        callback(err, rows);
        close();
    });
}

async function update(name) {
    let str = "SELECT * FROM Files WHERE Name LIKE '" + name + "'";
    console.log(str);
    connect();
    db.all(str, [], (err, rows) => {
        if(!err) console.log(rows.length + ' rows retrieved');
        if(rows.length == 0) db.exec("INSERT INTO Files(Name, Ct) VALUES('" + name + "', 1);", err =>{});
        else db.exec("UPDATE Files SET Ct = Ct + 1 WHERE Id = " + rows[0].Id, err => {});
        close();
    });
}

let fsopen = promisify(fs.open);
let fsread = promisify(fs.read);
let fsclose = promisify(fs.close);


app.get('/:name', async function (req, res) {
    console.log(req.params);
    if(req.params.name == 'statystyki') {
        getAll((err, rows) => {
            res.send(rows);
        });
    }
    else {
        fs.readFile(req.params.name, (err, cont) => {
            if(!err) {
                update(req.params.name);
                res.send(cont);
                return;
            }
            if(err.errno == -2) res.send("file not present");
            else {
                console.log(err);
                res.send(err);
            }
        });
    }
})

// parse arguments -n is new database and -p is port
for(var i = 0;i < process.argv.length; i++) {
    if(process.argv[i] == '-n') {
        console.log("loading database");
        connect();
        init();
        close();
    }
    if(process.argv[i] == '-p') {
        var p = parseInt(process.argv[i+1], 10);
        if (!isNaN(p)) port = p;
        else console.log("please, provide a valid port");
    }
}

app.listen(port, function() {
    console.log('server is running on port ' + port);
});
const serverconfig = require('./config.json')

const fs = require('fs');
const express = require('express');
const logger = require('morgan');
const cors = require('cors');

const app = express();

app.use(logger(':date[iso] ":method :url"'));
app.use(cors());

const pgp = require('pg-promise')({
    /*query: (e) => {
        console.log(e.query);
    }*/
});

function loadLayerMap(){
    // assumes queries are in subdirectory 'layers'
    let files = fs.readdirSync(`${__dirname}/layers`);
    files = files.filter(file=>file.slice(-5) === '.json');
    let configs = files.map(file=>{
        let rawdata = fs.readFileSync(`${__dirname}/layers/${file}`);
        let config = JSON.parse(rawdata);
        config.host = config.host ? config.host : process.env.PGHOST;
        config.user = config.user ? config.user : process.env.PGUSER;
        config.password = config.password ? config.password : process.PGPASSWORD;
        config.database = config.database ? config.database : process.env.PGDATABASE;
        config.ssl = config.ssl ? config.ssl : process.PGSSLMODE;
        config.port = config.port ? config.port : process.PGPORT ? process.env.PGPORT : 5432;
        if (Array.isArray(config.sql)) {
            config.sql = config.sql.join('\n');
        }    
        config.file = file;
        config.layer = file.slice(0,-5);
        config.dbConnection = pgp(config);
        return config;
    });
    let layerMap = new Map();
    for (let config of configs) {
        layerMap.set(config.layer, config);
    }
    return layerMap;
}

let layerMap = loadLayerMap();

if (layerMap.size === 0) {
    console.log('no layer definitions found in directory ./layers, aborting');
    process.exit(1);
}

console.log('Loaded configurations for layers:');
for (let layerconfig of layerMap.keys()) {
    console.log(layerconfig);
}

app.get('/mvt/:layer/:z/:x/:y.:extension', async (req, res)=> {
    let config = layerMap.get(req.params.layer);
    if (!config) {
        res.status(422).json({error: `layer '${req.params.layer}' not found`})
        return;
    }
    let z = parseInt(req.params.z);
    let x = parseInt(req.params.x);
    let y = parseInt(req.params.y);
    let sql = config.sql.replace(/\${z}|\${x}|\${y}/gi, (match)=>{
        switch (match) {
            case '${z}':
            case '${Z}':
                return z.toString();
            case '${x}':
            case '${X}':
                return x.toString();
            case '${y}':
            case '${Y}':
                return y.toString();
            default:
                return 'undefined'
        }
    });
    switch(req.params.extension) {
        case 'sql':
            if (serverconfig.sqlinfo) {
                res.json({sql: sql});
            } else {
                res.status('403').json({error: 'sql info not enabled'})
            }
            break;
        case 'mvt':
        case 'pbf':
            try {
                const result = await config.dbConnection.one(sql, []);
                const tileData = result.tile ? result.tile : result[Object.keys(result)[0]];
                if (tileData.length === 0) {
                    res.status(204)
                }
                res.header('Content-Type', 'application/x-protobuf').send(tileData);
            } catch(err) {
                console.log(err);
                let status = 500;
                switch (err.code) {
                    case '42P01':
                        // table does not exist
                        status = 422;
                        break;
                    case '42703':
                        // column does not exist
                        status = 422;
                        break;
                    default:
                }
                res.status(status).json({error:err.message})
            }
            break;
        default:
            res.status(422).json({error: `extension '${req.params.extension}' not supported`})
    }
})

const server = app.listen(serverconfig.port);
server.setTimeout(600000);
console.log(`pgserver listening on port ${serverconfig.port}`);


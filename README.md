# pgsql2mvt
Serve user defined PostGIS queries as mapbox vector tile layers  
Other mvt servers let you define databases, fields and tables, but if you have special requirements, such as multiple layer output in a single mvt tile or special 'where' clauses or joined tables or unions or function calls or type conversions or concatenated attributes or tables from multiple databases, this tool may come in handy.

## Requirements
* git
* node

## Install
```
git clone this_repository
cd this_repository
npm install
```

## Configure
The pgsql2mvt service requires one json configuration file per layer in directory 'layers'  
See layers/example.json.example, remove the '.example' extension and edit to your needs. ${z}, ${x} and ${y} are placeholders for tile coordinates z, x, y

Restart the service to load configuration changes

**Note**: for reasons of user-friendlyness, the sql queries in the layer configuration can be split into multiple json lines (json array of strings). If you copy-paste these lines into tool '[DBeaver](https://dbeaver.io)', DBeaver automagically removes quotes and trailing comma's and asks to supply values for z, x and y. You can also inspect the generated sql query by setting '.sql' as url extension (see urls described below)

## Run
```
npm start
```

The started service serves tiles at urls: 
1. http://localhost:8095/mvt/example/z/x/y.mvt
2. http://localhost:8095/mvt/example/z/x/y.pbf

Where 'example' is the name of your layer (as defined in layers/example.json)   
z, x, y, are the tile coordinates for the mvt or pbf tile. The contents of mvt and pbf are identical.

You can inspect the used sql query at url (config.json property 'sqlinfo': true):
http://localhost:8095/mvt/example/z/x/y.sql


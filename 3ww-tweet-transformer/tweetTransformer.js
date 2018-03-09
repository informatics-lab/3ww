'use strict';
const AWS = require('aws-sdk');
var path = require('path');
const httpClient = require("./httpClient");
const luis = require("./luisCreds");
const gmaps = require("./gmapsCreds");
const gsd = require("./gsdCreds");


var esDomain = {
    region: 'eu-west-1',
    endpoint: process.env.ES_DOMAIN,
    index: 'geojson',
    doctype: 'feature'
};
var endpoint = new AWS.Endpoint(esDomain.endpoint);
/*
 * The AWS credentials are picked up from the environment.
 * They belong to the IAM role assigned to the Lambda function.
 * Since the ES requests are signed using these credentials,
 * make sure to apply a policy that allows ES domain operations
 * to the role.
 */
var creds = new AWS.EnvironmentCredentials('AWS');
const luis_endpoint = luis.endpoint;
const gmaps_endpoint = gmaps.endpoint;

/**
 * Updates the GeoJSON object inplace with the location details extracted from the tweet.
 * @param geoJson
 * @param tweetObj
 * @param luis_response
 */
function processLocation(geoJson, tweetObj, luis_response) {
    // optimal solution... see if tweet geo location was found
    // only gives us a lat/lng no location place name
    if (tweetObj.coordinates) {
        geoJson.geometry.coordinates = tweetObj.coordinates.coordinates;
    }

    // try to determine if twitter has already identified place name for us
    if (tweetObj.place) {
        geoJson.properties.location = tweetObj.place.full_name;
    } else {
        // otherwise see if luis has found place name
        let luis_location = luis_response.entities.find((entity) => {
            return entity.type === "Weather.Location";
        });
        if (luis_location) {
            geoJson.properties.location = luis_location.entity;
        } else {
            // otherwise use location of users account
            if (tweetObj.user.location) {
                geoJson.properties.location = tweetObj.user.location;
            }
        }
    }
    return geoJson;
}

/**
 * Maps a tweet into a GeoJSON object.
 * @param record
 * @returns {Promise}
 */
function mapTweetToGeoJson(record) {
    return new Promise(function (resolve, reject) {

        console.log("Record:\n", record);
        let tweetObj = JSON.parse(record);
        let text = tweetObj.text.toLowerCase();
        text = text.replace("#","");
        text = text.replace("threewordweather", "");
        text = text.replace("3wordweather", "");
        text = text.replace("\n", " ");
        text = text.replace("&amp;", "&");
        console.log(`now processing text: ${text}`);


        let geo_json = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": null,
            },
            "properties": {
                "created_at": new Date(tweetObj.created_at).toISOString(),
                "weather_words": [],
                "location": null,
                "forecast": null,
                "tweet": tweetObj,
            }
        };

        //NLP tweet
        httpClient.getAsJson(`${luis_endpoint}${text}`)
            .then((luis_response) => {
                if (luis_response && luis_response.topScoringIntent && luis_response.topScoringIntent.intent === "ThreeWordWeather") {

                    let weatherWords = luis_response.entities.filter((entity) => {
                        return (entity.type === "WeatherWord");
                    }).map((entity) => {
                        return entity.entity;
                    });

                    let weatherWordsList = luis_response.entities.filter((entity) => {
                        return (entity.type === "weather word list");
                    }).map((entity) => {
                        return entity.entity;
                    });

                    if (weatherWordsList.length >= weatherWords.length || weatherWords.length > 3) {
                        geo_json.properties.weather_words = weatherWordsList;
                    } else {
                        geo_json.properties.weather_words = weatherWords;
                    }

                    geo_json = processLocation(geo_json, tweetObj, luis_response);

                    if (geo_json.geometry.coordinates) {
                        resolve(geo_json);
                    } else if (geo_json.properties.location) {
                        let encoded = encodeURIComponent(geo_json.properties.location);
                        return httpClient.getAsJson(`${gmaps_endpoint}${encoded}`);
                    } else {
                        //no location found
                        console.log("no location found in tweet");
                        resolve(geo_json);
                    }
                } else {
                    //didn't match our NLP model.
                    console.log("tweet did not match with NLP model");
                    resolve(geo_json);
                }
            })
            .then((gmaps_response) => {
                if (gmaps_response && gmaps_response.results && gmaps_response.results.length > 0) {
                    if(gmaps_response.results[0].geometry) {
                        let lng = gmaps_response.results[0].geometry.location.lng;
                        let lat = gmaps_response.results[0].geometry.location.lat;
                        geo_json.geometry.coordinates = [lng, lat];
                    }
                }
                if (geo_json.geometry.coordinates) {
                    return httpClient.getAsJson(gsd.endpoint(geo_json.geometry.coordinates[0], geo_json.geometry.coordinates[1]), gsd.headers);
                } else {
                    resolve(geo_json);
                }
            })
            .then((gsd_response) => {
                if (gsd_response && gsd_response.features) {
                    geo_json.properties.forecast = {
                        "type": "Feature",
                        "geometry": gsd_response.features[0].geometry,
                        "properties": {
                            "request_point_distance": gsd_response.features[0].properties.request_point_distance,
                            "conditions": gsd_response.features[0].properties.time_series[0]
                        }
                    };
                }
                resolve(geo_json);
            })
            .catch((err) => {
                console.log(`Error: ${err}`);
                resolve(geo_json);
            });
    });
}

exports.handler = (event, context, callback) => {

    /* Process the list of records and transform them */
    let promises = event.Records.map((record) => {
        return mapTweetToGeoJson(record.Sns.Message);
    });

    Promise.all(promises)
        .then((results) => {

            results.forEach((r) => {

                let str = JSON.stringify(r);
                console.log(str);
                if(!r.geometry.coordinates){
                    console.log("not storing processed as no coordinates");
                } else if(!r.properties.weather_words || r.properties.weather_words.length == 0) {
                    console.log("not storing processed as no weather words found");
                } else {
                    postToES(str, context);
                }

            });

            callback(null, {"results": results});
        })
        .catch((err) => {
            console.log("Error converting records:\n", err)
        });
};

/*
 * Post the given document to Elasticsearch
 */
function postToES(doc, context) {
    var req = new AWS.HttpRequest(endpoint);

    req.method = 'POST';
    req.path = path.join('/', esDomain.index, esDomain.doctype);
    req.region = esDomain.region;
    req.headers['presigned-expires'] = false;
    req.headers['Host'] = endpoint.host;
    req.headers['Content-Type'] = "application/json";
    req.body = doc;

    var signer = new AWS.Signers.V4(req , 'es');  // es: service code
    signer.addAuthorization(creds, new Date());

    var send = new AWS.NodeHttpClient();
    send.handleRequest(req, null, function(httpResp) {
        var respBody = '';
        httpResp.on('data', function (chunk) {
            respBody += chunk;
        });
        httpResp.on('end', function (chunk) {
            console.log('Response: ' + respBody);
            context.succeed('Lambda added document ' + doc);
        });
    }, function(err) {
        console.log('Error: ' + err);
        context.fail('Lambda failed with error ' + err);
    });
}

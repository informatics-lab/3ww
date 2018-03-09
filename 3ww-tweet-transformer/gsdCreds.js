"use strict";

// credentials for global spot data
module.exports = {
    endpoint : function(lng, lat) {
        return `https://pwms.datapoint.metoffice.gov.uk/points/v1/pwms-hourly-spot-forecast?longitude=${lng}&latitude=${lat}`;
    },
    headers : {
        "api-key": process.env.MET_OFFICE_GSD_API_KEY
    }
};
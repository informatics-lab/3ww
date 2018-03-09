"use strict";

// credentials for google maps
module.exports = {
    endpoint : `https://maps.googleapis.com/maps/api/geocode/json?key=${process.env.GOOGLE_MAPS_API_KEY}&region=uk&language=en&address=`
};
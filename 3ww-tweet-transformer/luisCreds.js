"use strict";


// credentials for luis
module.exports = {
    endpoint : `https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/${process.env.LUIS_APPLICATION_ID}?subscription-key=${process.env.LUIS_SUBCRIPTION_KEY}&verbose=true&timezoneOffset=0&q=`
};
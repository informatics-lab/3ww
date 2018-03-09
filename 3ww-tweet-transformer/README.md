# 3ww-tweet-transformer
Stage two of 3ww-step-function.  
Parses scraped tweets to extract weather words and locations then adds location specific data. 

### installation
`npm install`

### packaging
`npm run zip`

### deployment
Requires existing endpoints for Google Geocoding API, LUIS, Met Office Spot Data & Elasticsearch.
Deployed as AWS Lambda with:   
Runtime `Node.js 6.10`  
Handler `tweetTransformer.handler`  
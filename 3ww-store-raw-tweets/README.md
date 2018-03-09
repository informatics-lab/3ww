# 3ww-store-raw-tweets
First step of the data pipeline to store raw tweets before we attempt to process them.

### installation
`pip install elasticsearch requests_aws4auth -t .`

### packaging
`zip -r 3ww-store-raw-tweets.zip .`

### deployment
Requires an existing elastic search endpoint to insert the data.
Deployed as AWS Lambda with:   
Runtime `Python 3.6`  
Handler `lambda_function.lambda_handler`  

Operates a the first function in the 3ww-step-function
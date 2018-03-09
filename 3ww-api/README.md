# 3ww-api
API for the 3ww elasticsearch db

### installation
`pip install elasticsearch requests_aws4auth -t .`

### packaging
`zip -r 3ww-api.zip .`

### deployment
Requires an existing elastic search endpoint to query for the data.
Deployed as AWS Lambda with:   
Runtime `Python 3.6`  
Handler `lambda_function.lambda_handler`  

Sits behind Amazon API Gateway using `LAMBDA_PROXY`.
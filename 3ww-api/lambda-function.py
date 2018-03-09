import boto3
import json
import os

from elasticsearch import Elasticsearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

print('Loading function')


ES_DOMAIN = os.environ('ES_DOMAIN')
TWEETS_SINCE = '2018-02-23T00:00:00.000Z'


def respond(err, res=None):
    return {
        'statusCode': '400' if err else '200',
        'body': err.message if err else json.dumps(res),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'max-age=120'
        },
    }


# code modified from
# https://aws.amazon.com/blogs/database/indexing-metadata-in-amazon-elasticsearch-service-using-aws-lambda-and-python/
def connectES(esEndPoint):
    session = boto3.Session()
    credentials = session.get_credentials()
    region = os.environ['AWS_REGION']
    awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, 'es', session_token=credentials.token)

    print ('Connecting to the ES Endpoint {0}'.format(esEndPoint))
    try:
        esClient = Elasticsearch(
            hosts=[{'host': esEndPoint, 'port': 443}],
            http_auth=awsauth,
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection)
        return esClient
    except Exception as E:
        print("Unable to connect to {0}".format(esEndPoint))
        print(E)
        exit(3)


def lambda_handler(event, context):
    operation = event['httpMethod']
    if operation != 'GET':
        return respond(ValueError('Unsupported method "{}"'.format(operation)))

    client = connectES(ES_DOMAIN)
    result = client.search('geojson', q='properties.created_at:['+TWEETS_SINCE+' TO now]', sort='properties.created_at:desc', size=1000)
    tweets = result['hits']['hits']
    feature_collection = {
        'type': 'FeatureCollection',
        'features': tweets
    }
    return respond(None, feature_collection)

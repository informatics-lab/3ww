import boto3
import os

from elasticsearch import Elasticsearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

print('Loading function')

ES_DOMAIN = os.environ('ES_DOMAIN')


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
    esdomain = ES_DOMAIN
    print(event)
    records = event['Records']
    try:
        client = connectES(esdomain)
        for record in records:
            print(client.index(index='raw-tweets', doc_type='tweet', body=record['Sns']['Message']))
    except Exception as e:
        print(e) # always want to continue executing step function
    return event
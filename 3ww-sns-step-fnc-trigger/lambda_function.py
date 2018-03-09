import json
import boto3
import uuid
import os

AWS_SNS_ARN = os.environ('AWS_SNS_ARN')


def lambda_handler(event, context):
    print(event)
    client = boto3.client('stepfunctions')
    # name needs to be unique, obviously want a better way to do this
    name = str(uuid.uuid4())
    response = client.start_execution(
        stateMachineArn=AWS_SNS_ARN,
        name=name,
        input=json.dumps(event)
    )
    print(response)
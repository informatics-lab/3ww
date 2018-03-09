# 3ww-sns-step-fnc-trigger
Triggered by the SNS endpoint, kicks off the step function referenced by the supplied arn. 

### deployment
Requires an existing AWS SNS topic to trigger it and a AWS Step Function ARN to route events to.
Deployed as AWS Lambda with:   
Runtime `Python 3.6`  
Handler `lambda_function.lambda_handler`  

Acts as the trigger for 3ww-step-function.
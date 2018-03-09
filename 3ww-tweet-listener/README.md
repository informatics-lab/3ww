# 3ww-tweet-listener
A standalone dockerised instance of Logstash configured to scrape twitter for 
given arguments and send them as json payloads to an SNS endpoint.
During 3ww this was deployed on AWS ECS as a `Service` with a single `Task`.  

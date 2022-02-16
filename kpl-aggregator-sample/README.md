# KPL Java Sample Application with pre-aggregation by type

## Setup

You will need the following:

+ A stream to put into (with any number of shards). One is created for you by the [CDK project](../README.md).
+ AWS credentials, preferably an IAM role if using EC2
+ JDK
+ Maven (```brew install maven```, ```sudo apt-get install maven```, [Amazon Linux](https://gist.github.com/sebsto/19b99f1fa1f32cae5d00))

You should point this sample producer at the "out" Kinesis stream setup by the AwsLambdaFanoutStack.

If running locally, set environment variables for the AWS credentials:

```
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_KEY=...
```

If running in EC2, the KPL will automatically retrieve credentials from any associated IAM role.

You can also pass credentials to the KPL programmatically during initialization.

## Run the Sample Application

The sample application is a Maven project. It takes dependencies on the KPL and KCL and contains both a producer and consumer.

Refer to the documentation within the code files for more details about what it's actually doing.

The sample producer takes optional positional parameters for the stream name, region and duration of the test in seconds. 


Build the sample application:

```
mvn clean package
```

Then run the producer to put some data into a stream called ``<Name of the out kinesis stream>`` in ``<region you deployed to>`` for ``100 seconds``:

```
mvn exec:java -Dexec.mainClass="com.amazonaws.services.kinesis.producer.sample.SampleProducer" -Dexec.args="<Name of the out kinesis stream> <region you deployed to> 100"
```



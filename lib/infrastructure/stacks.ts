/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Aws, CfnOutput, Duration, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {LogGroup} from "aws-cdk-lib/aws-logs";
import {HttpApi, HttpConnectionType} from "@aws-cdk/aws-apigatewayv2-alpha";
import {CfnIntegration, CfnRoute, CfnStage} from "aws-cdk-lib/aws-apigatewayv2";
import {Stream, StreamEncryption} from "aws-cdk-lib/aws-kinesis";
import {Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {CfnEventSourceMapping, EventSourceMapping, Runtime, StartingPosition, Tracing} from "aws-cdk-lib/aws-lambda";
import {KinesisEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from "path";
import {AttributeType, BillingMode, Table, TableEncryption} from "aws-cdk-lib/aws-dynamodb";
import {
    Dashboard,
    LogQueryVisualizationType,
    LogQueryWidget,
    PeriodOverride,
    SingleValueWidget
} from "aws-cdk-lib/aws-cloudwatch";
import {NagSuppressions} from "cdk-nag";

;

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class Stacks extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const dashboard = new Dashboard(this, "dashboard", {
            dashboardName: "AwsLambdaFanout",
            periodOverride: PeriodOverride.AUTO

        })

        const api = new HttpApi(this, "aws-lambda-fanout-api", {
            apiName: `aws-lambda-fanout-api`,
            createDefaultStage: true,

        })

        const apiLogGroup = new LogGroup(this, "aws-lambda-fanout-api-log-group", {
            logGroupName: `/poc/aws-lambda-fanout/api`,
            removalPolicy: RemovalPolicy.DESTROY

        })
        const defaultStage = api.defaultStage?.node.defaultChild as CfnStage
        defaultStage.accessLogSettings = {
            destinationArn: apiLogGroup.logGroupArn,
            format: JSON.stringify({
                "requestId": "$context.requestId",
                "ip": "$context.identity.sourceIp",
                "caller": "$context.identity.caller",
                "user": "$context.identity.user",
                "requestTime": "$context.requestTime",
                "httpMethod": "$context.httpMethod",
                "resourcePath": "$context.resourcePath",
                "status": "$context.status",
                "protocol": "$context.protocol",
                "responseLength": "$context.responseLength"
            })
        }

        const apiGatewayRole = new Role(this, 'api-gateway-role', {
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com')
        });

        const inStream = new Stream(this, 'InStream', {
            encryption: StreamEncryption.MANAGED
        });

        const integration = new CfnIntegration(this, "kinesis-integration", {
            apiId: api.apiId,
            connectionType: HttpConnectionType.INTERNET.toString(),
            integrationSubtype: "Kinesis-PutRecord",
            integrationType: "AWS_PROXY",
            payloadFormatVersion: "1.0",
            requestParameters: {
                StreamName: inStream.streamName,
                Data: "$request.body",
                PartitionKey: "$request.path.partitionKey"
            },
            credentialsArn: apiGatewayRole.roleArn,

        })

        const route = new CfnRoute(this, "kinesis-route", {
            apiId: api.apiId,
            routeKey: "POST /record/{partitionKey}",
            target: `integrations/${integration.ref}`
        })
        route.addDependsOn(integration)
        const outStream = new Stream(this, 'OutStream', {
            encryption: StreamEncryption.MANAGED
        });
        const fanOutLambda = new NodejsFunction(this, "fanout-function", {
            memorySize: 256,
            timeout: Duration.seconds(5),
            runtime: Runtime.NODEJS_14_X,
            handler: "lambdaHandler",
            entry: path.join(__dirname, `/../runtime/fanout.ts`),
            environment: {
                "STREAM_NAME": outStream.streamName
            },
            tracing: Tracing.ACTIVE

        });
        const table = new Table(this, "downstream-table", {
            billingMode: BillingMode.PAY_PER_REQUEST,
            encryption: TableEncryption.AWS_MANAGED,
            partitionKey: {
                name: "id",
                type: AttributeType.STRING
            },
            sortKey: {
                name: "partition",
                type: AttributeType.STRING
            },
            pointInTimeRecovery: true
        })

        const downstreamLambda = new NodejsFunction(this, "downstream-function", {
            memorySize: 256,
            timeout: Duration.seconds(5),
            runtime: Runtime.NODEJS_14_X,
            handler: "lambdaHandler",
            entry: path.join(__dirname, `/../runtime/downstream.ts`),
            environment: {
                "TABLE_NAME": table.tableName
            },
            tracing: Tracing.ACTIVE

        });

        fanOutLambda.addEventSource(new KinesisEventSource(inStream, {
            batchSize: 10,

            retryAttempts: 3,

            startingPosition: StartingPosition.LATEST
        }))
        const downstreamEventSource=new EventSourceMapping(this,"outstreamMapping",{
            eventSourceArn: outStream.streamArn,
            target: downstreamLambda,
            bisectBatchOnError: false,
            enabled: true,
            batchSize: 10,
            retryAttempts: 3,
            startingPosition: StartingPosition.LATEST,
        })


        const cfnDownstreamEventSource=downstreamEventSource.node.defaultChild as CfnEventSourceMapping
        cfnDownstreamEventSource.addPropertyOverride('FilterCriteria', {
            "Filters": [
                {
                    "Pattern": "{  \"partitionKey\":  [ {\"prefix\": \"1_\"},\"CHAT\",\"RAISE_HAND\"] }"
                }
            ]
        })
        inStream.grantRead(fanOutLambda)
        inStream.grantWrite(apiGatewayRole)
        outStream.grantWrite(fanOutLambda)
        outStream.grantRead(downstreamLambda)
        table.grantWriteData(downstreamLambda)

        const kinesisWidget = new SingleValueWidget({
            height: 13,
            width: 12,
            title: "Kinesis",
            region: Aws.REGION,
            metrics: [
                inStream.metricIncomingRecords({
                    label: "InStream - IncomingRecords",
                    period: Duration.seconds(900),
                    region: Aws.REGION,
                    statistic: "Sum",

                }),
                outStream.metricIncomingRecords({
                    label: "OutStream - IncomingRecords",
                    period: Duration.seconds(900),
                    region: Aws.REGION,
                    statistic: "Sum",

                })
            ]

        })
        const fanoutLambdaWidget = new SingleValueWidget({
            height: 13,
            width: 12,
            title: "Fanout Lambda",
            region: Aws.REGION,
            metrics: [
                fanOutLambda.metricInvocations({
                    label: "Invocations",
                    period: Duration.seconds(900),
                    region: Aws.REGION,
                    statistic: "Sum",

                }),
                fanOutLambda.metricErrors({
                    label: "Errors",
                    period: Duration.seconds(900),
                    region: Aws.REGION,
                    statistic: "Sum",

                }),
                fanOutLambda.metricThrottles({
                    label: "Throttles",
                    period: Duration.seconds(900),
                    region: Aws.REGION,
                    statistic: "Sum",

                }),
            ]

        })
        const downstreamLambdaWidget = new SingleValueWidget({
            height: 13,
            width: 12,
            title: "Downstream Lambda",
            region: Aws.REGION,
            metrics: [
                downstreamLambda.metricInvocations({
                    label: "Invocations",
                    period: Duration.seconds(900),
                    region: Aws.REGION,
                    statistic: "Sum",

                }),
                downstreamLambda.metricErrors({
                    label: "Errors",
                    period: Duration.seconds(900),
                    region: Aws.REGION,
                    statistic: "Sum",

                }),
                downstreamLambda.metricThrottles({
                    label: "Throttles",
                    period: Duration.seconds(900),
                    region: Aws.REGION,
                    statistic: "Sum",

                }),
            ]

        })
        const fanoutLogsQuery = new LogQueryWidget({
            logGroupNames: [fanOutLambda.logGroup.logGroupName],
            height: 3,
            width: 12,
            region: Aws.REGION,
            queryString: "filter @message like /Fanout success/ | stats count(*) as Count",
            title: "Fanout Lambda Success Count",
            view: LogQueryVisualizationType.TABLE
        })
        const downstreamLogsQuery = new LogQueryWidget({
            logGroupNames: [downstreamLambda.logGroup.logGroupName],
            height: 3,
            width: 12,
            region: Aws.REGION,
            queryString: "filter @message like /Downstream response/ | stats count(*) as Count",
            title: "Downstream Lambda Success Count",
            view: LogQueryVisualizationType.TABLE
        })

        dashboard.addWidgets(kinesisWidget, fanoutLambdaWidget, downstreamLambdaWidget, fanoutLogsQuery, downstreamLogsQuery)
        new CfnOutput(this, "record-url", {
            value: `${api.apiEndpoint}/record`,
            description: "The api endpoint to send records to",
        })
        new CfnOutput(this, "outstream-name", {
            value: outStream.streamName,
            description: "The name of the kinesis output stream. Point the KPL sample client at this stream",
        })
        //CDK Nag Suppressions
        NagSuppressions.addResourceSuppressionsByPath(this,"/AwsLambdaFanoutStack/api-gateway-role/DefaultPolicy/Resource",[{ id: "AwsSolutions-IAM5", reason: "Following directions here https://docs.aws.amazon.com/apigateway/latest/developerguide/integrating-api-with-aws-services-kinesis.html" }])
        NagSuppressions.addResourceSuppressionsByPath(this,"/AwsLambdaFanoutStack/fanout-function/ServiceRole/Resource",[{ id: "AwsSolutions-IAM4", reason: "I'm ok using managed policies for this example" }])
        NagSuppressions.addResourceSuppressionsByPath(this,"/AwsLambdaFanoutStack/fanout-function/ServiceRole/DefaultPolicy/Resource",[{ id: "AwsSolutions-IAM5", reason: "Wildcard is for xray support" }])
        NagSuppressions.addResourceSuppressionsByPath(this,"/AwsLambdaFanoutStack/downstream-function/ServiceRole/Resource",[{ id: "AwsSolutions-IAM4", reason: "I'm ok using managed policies for this example" }])
        NagSuppressions.addResourceSuppressionsByPath(this,"AwsLambdaFanoutStack/downstream-function/ServiceRole/DefaultPolicy/Resource",[{ id: "AwsSolutions-IAM5", reason: "Wildcard is for xray support" }])
        NagSuppressions.addResourceSuppressionsByPath(this,"/AwsLambdaFanoutStack/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/Resource",[{ id: "AwsSolutions-IAM4", reason: "I'm ok using managed policies for this example" }])
        NagSuppressions.addResourceSuppressionsByPath(this,"/AwsLambdaFanoutStack/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource",[{ id: "AwsSolutions-IAM5", reason: "Wildcard is for log rentetion support" }])
        NagSuppressions.addResourceSuppressionsByPath(this,"/AwsLambdaFanoutStack/kinesis-route",[{ id: "AwsSolutions-APIG4", reason: "I'm ok with no api authorization for this example" }])
    }

}



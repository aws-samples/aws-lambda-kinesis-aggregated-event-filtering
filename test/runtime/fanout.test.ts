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

import * as AWSXRay from "aws-xray-sdk";
import {lambdaHandler} from "../../lib/runtime/fanout"
import * as sinon from "sinon"
import {KinesisStreamEvent} from "aws-lambda";
import {KinesisClient} from "@aws-sdk/client-kinesis";

test("Can add an UpdateAutoScalingGroupEvent to the database", () => {
    const event={
        "Records": [
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "1",
                    "sequenceNumber": "49624958916590210577727565880068779822533339996032598018",
                    "data": "ew0KCSJpZCI6ICJmODA1N2QyMC1lYWY1LTRlZTgtYWZhNC03ZDY5NWVhZDQ3NDYiLA0KCSJNZXNzYWdlIjogIkhlbGxvIGZyb20gMSIsDQoJIlR5cGUiOiAiMSINCn0NCg==",
                    "approximateArrivalTimestamp": 1644263614.237
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000000:49624958916590210577727565880068779822533339996032598018",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::123456789123:role/AwsLambdaFanoutStack-fanoutfunctionServiceRoleDD96-13GVG58W235MT",
                "awsRegion": "us-east-2",
                "eventSourceARN": "arn:aws:kinesis:us-east-2:123456789123:stream/AwsLambdaFanoutStack-InStream7CA69DF8-C2P9NqRB965J"
            },
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "1",
                    "sequenceNumber": "49624958916590210577727565880171538517200583475882622978",
                    "data": "ew0KCSJpZCI6ICJmODA1N2QyMC1lYWY1LTRlZTgtYWZhNC03ZDY5NWVhZDQ3NDYiLA0KCSJNZXNzYWdlIjogIkhlbGxvIGZyb20gMSIsDQoJIlR5cGUiOiAiMSINCn0NCg==",
                    "approximateArrivalTimestamp": 1644263614.355
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000000:49624958916590210577727565880171538517200583475882622978",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::123456789123:role/AwsLambdaFanoutStack-fanoutfunctionServiceRoleDD96-13GVG58W235MT",
                "awsRegion": "us-east-2",
                "eventSourceARN": "arn:aws:kinesis:us-east-2:123456789123:stream/AwsLambdaFanoutStack-InStream7CA69DF8-C2P9NqRB965J"
            },
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "1",
                    "sequenceNumber": "49624958916590210577727565880282759692605129359955591170",
                    "data": "ew0KCSJpZCI6ICJmODA1N2QyMC1lYWY1LTRlZTgtYWZhNC03ZDY5NWVhZDQ3NDYiLA0KCSJNZXNzYWdlIjogIkhlbGxvIGZyb20gMSIsDQoJIlR5cGUiOiAiMSINCn0NCg==",
                    "approximateArrivalTimestamp": 1644263614.484
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000000:49624958916590210577727565880282759692605129359955591170",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::123456789123:role/AwsLambdaFanoutStack-fanoutfunctionServiceRoleDD96-13GVG58W235MT",
                "awsRegion": "us-east-2",
                "eventSourceARN": "arn:aws:kinesis:us-east-2:123456789123:stream/AwsLambdaFanoutStack-InStream7CA69DF8-C2P9NqRB965J"
            },
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "1",
                    "sequenceNumber": "49624958916590210577727565880345623835225090077040312322",
                    "data": "ew0KCSJpZCI6ICJmODA1N2QyMC1lYWY1LTRlZTgtYWZhNC03ZDY5NWVhZDQ3NDYiLA0KCSJNZXNzYWdlIjogIkhlbGxvIGZyb20gMSIsDQoJIlR5cGUiOiAiMSINCn0NCg==",
                    "approximateArrivalTimestamp": 1644263614.567
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000000:49624958916590210577727565880345623835225090077040312322",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::123456789123:role/AwsLambdaFanoutStack-fanoutfunctionServiceRoleDD96-13GVG58W235MT",
                "awsRegion": "us-east-2",
                "eventSourceARN": "arn:aws:kinesis:us-east-2:123456789123:stream/AwsLambdaFanoutStack-InStream7CA69DF8-C2P9NqRB965J"
            },
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "1",
                    "sequenceNumber": "49624958916590210577727565880439920049155031152667394050",
                    "data": "ew0KCSJpZCI6ICJmODA1N2QyMC1lYWY1LTRlZTgtYWZhNC03ZDY5NWVhZDQ3NDYiLA0KCSJNZXNzYWdlIjogIkhlbGxvIGZyb20gMSIsDQoJIlR5cGUiOiAiMSINCn0NCg==",
                    "approximateArrivalTimestamp": 1644263614.655
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000000:49624958916590210577727565880439920049155031152667394050",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::123456789123:role/AwsLambdaFanoutStack-fanoutfunctionServiceRoleDD96-13GVG58W235MT",
                "awsRegion": "us-east-2",
                "eventSourceARN": "arn:aws:kinesis:us-east-2:123456789123:stream/AwsLambdaFanoutStack-InStream7CA69DF8-C2P9NqRB965J"
            },
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "1",
                    "sequenceNumber": "49624958916590210577727565880529380559806513711595651074",
                    "data": "ew0KCSJpZCI6ICJmODA1N2QyMC1lYWY1LTRlZTgtYWZhNC03ZDY5NWVhZDQ3NDYiLA0KCSJNZXNzYWdlIjogIkhlbGxvIGZyb20gMSIsDQoJIlR5cGUiOiAiMSINCn0NCg==",
                    "approximateArrivalTimestamp": 1644263614.744
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000000:49624958916590210577727565880529380559806513711595651074",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::123456789123:role/AwsLambdaFanoutStack-fanoutfunctionServiceRoleDD96-13GVG58W235MT",
                "awsRegion": "us-east-2",
                "eventSourceARN": "arn:aws:kinesis:us-east-2:123456789123:stream/AwsLambdaFanoutStack-InStream7CA69DF8-C2P9NqRB965J"
            },
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "1",
                    "sequenceNumber": "49624958916590210577727565880601916108983391462078021634",
                    "data": "ew0KCSJpZCI6ICJmODA1N2QyMC1lYWY1LTRlZTgtYWZhNC03ZDY5NWVhZDQ3NDYiLA0KCSJNZXNzYWdlIjogIkhlbGxvIGZyb20gMSIsDQoJIlR5cGUiOiAiMSINCn0NCg==",
                    "approximateArrivalTimestamp": 1644263614.796
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000000:49624958916590210577727565880601916108983391462078021634",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::123456789123:role/AwsLambdaFanoutStack-fanoutfunctionServiceRoleDD96-13GVG58W235MT",
                "awsRegion": "us-east-2",
                "eventSourceARN": "arn:aws:kinesis:us-east-2:123456789123:stream/AwsLambdaFanoutStack-InStream7CA69DF8-C2P9NqRB965J"
            },
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "1",
                    "sequenceNumber": "49624958916590210577727565880681705213077956987608629250",
                    "data": "ew0KCSJpZCI6ICJmODA1N2QyMC1lYWY1LTRlZTgtYWZhNC03ZDY5NWVhZDQ3NDYiLA0KCSJNZXNzYWdlIjogIkhlbGxvIGZyb20gMSIsDQoJIlR5cGUiOiAiMSINCn0NCg==",
                    "approximateArrivalTimestamp": 1644263614.878
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000000:49624958916590210577727565880681705213077956987608629250",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::123456789123:role/AwsLambdaFanoutStack-fanoutfunctionServiceRoleDD96-13GVG58W235MT",
                "awsRegion": "us-east-2",
                "eventSourceARN": "arn:aws:kinesis:us-east-2:123456789123:stream/AwsLambdaFanoutStack-InStream7CA69DF8-C2P9NqRB965J"
            },
            {
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "1",
                    "sequenceNumber": "49624958916590210577727565880742151504058688515063414786",
                    "data": "ew0KCSJpZCI6ICJmODA1N2QyMC1lYWY1LTRlZTgtYWZhNC03ZDY5NWVhZDQ3NDYiLA0KCSJNZXNzYWdlIjogIkhlbGxvIGZyb20gMSIsDQoJIlR5cGUiOiAiMSINCn0NCg==",
                    "approximateArrivalTimestamp": 1644263614.964
                },
                "eventSource": "aws:kinesis",
                "eventVersion": "1.0",
                "eventID": "shardId-000000000000:49624958916590210577727565880742151504058688515063414786",
                "eventName": "aws:kinesis:record",
                "invokeIdentityArn": "arn:aws:iam::123456789123:role/AwsLambdaFanoutStack-fanoutfunctionServiceRoleDD96-13GVG58W235MT",
                "awsRegion": "us-east-2",
                "eventSourceARN": "arn:aws:kinesis:us-east-2:123456789123:stream/AwsLambdaFanoutStack-InStream7CA69DF8-C2P9NqRB965J"
            }
        ]
    }

    const incomingEvent = JSON.parse(JSON.stringify(event)) as KinesisStreamEvent
    AWSXRay.setContextMissingStrategy("IGNORE_ERROR");

    const kinesisClient = sinon.createStubInstance(KinesisClient)

    kinesisClient.send.resolves({
        $metadata: {
            httpStatusCode: 200
        }
    })

    return lambdaHandler(incomingEvent,{} as any).then((value) => {



    })
})
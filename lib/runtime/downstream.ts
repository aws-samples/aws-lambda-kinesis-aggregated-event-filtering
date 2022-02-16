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

import {KinesisStreamEvent} from "aws-lambda";
import {xrayScope} from "./xray";
import * as agg from "aws-kinesis-agg"
import {
    AttributeValueUpdate,
    DynamoDBClient,
    PutItemCommand,
    UpdateItemCommand,
    UpdateItemCommandOutput
} from "@aws-sdk/client-dynamodb";

export const lambdaHandler = xrayScope((segment) => async (
    event: KinesisStreamEvent
): Promise<String[]> => {
    const client = new DynamoDBClient({});
    try {
        console.log(`Event: ${JSON.stringify(event)}`)
        const results =  event.Records.map(record => {
            // Kinesis data is base64 encoded so decode here
            const userRecords:agg.UserRecord[] = []
            agg.deaggregateSync(record.kinesis,false,(err, r) => {
                r?.forEach(value1 => {
                    userRecords.push(value1)
                })
            })
            return userRecords.map(userRecord => {
                var payload = Buffer.from(userRecord.data, 'base64').toString('ascii');
                const value = JSON.parse(payload)
                console.log(value)
                const updateItem: UpdateItemCommand = new UpdateItemCommand({
                    Key: {
                        "id": {
                            S: value["id"]
                        },
                        "partition": {
                            S: userRecord.partitionKey
                        }
                    },
                    AttributeUpdates: {
                        "data": {
                            Action: "PUT",
                            Value: {
                                S: JSON.stringify(value)
                            }

                        },
                        "message_counter": {
                            Action: "ADD",
                            Value: {
                                N: "1"
                            }
                        }
                    },

                    TableName: process.env.TABLE_NAME!

                });
                return client.send(updateItem).then(response => {
                    console.log(`Downstream response: ${JSON.stringify(response)}`)
                    return "Success"
                }).catch(reason => {
                    console.log(`Downstream error: ${reason}`)
                    return "Failure"
                })
            })

        });

        const promises:Promise<String>[]=[]
        results.forEach(value => {
            value.forEach(value1 => {
                promises.push(value1)
            })
        })
        return Promise.all(promises).then(value => {
            return value
        })
    } catch (error) {
        console.log(`Downstream error: ${error}`)
        return Promise.resolve(["Failure"])
    } finally {
        console.log(`Done sending records to dynamodb`)
    }

}, "downstream-lambda");


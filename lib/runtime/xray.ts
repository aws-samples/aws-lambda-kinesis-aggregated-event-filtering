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
import {  Context } from "aws-lambda";
import { Subsegment } from "aws-xray-sdk";

export type Handler<TEvent = any, TResult = any> = (
    event: TEvent,
    context: Context,
) => Promise<void | TResult>;

export const xrayScope = <TEvent, TResult>(fn: (segment?: Subsegment ) => Handler<TEvent, TResult>,name:string): Handler<TEvent, TResult> => async (e, c) => {
    AWSXRay.captureAWS(require("aws-sdk"));
    AWSXRay.captureHTTPsGlobal(require("http"), true);
    AWSXRay.captureHTTPsGlobal(require("https"), true);
    AWSXRay.capturePromise();
    const segment = AWSXRay.getSegment()?.addNewSubsegment(name);
    if(segment!=null) {
        try {
            return await fn(segment)(e, c) as TResult
        } finally {
            if (!segment.isClosed()) {
                segment.close();
            }
        }
    }else{
        return await fn(undefined)(e, c) as TResult
    }
};
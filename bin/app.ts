#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Stacks } from '../lib/infrastructure/stacks';
import {Aspects} from "aws-cdk-lib";
import {AwsSolutionsChecks} from "cdk-nag";

const app = new cdk.App();
const env={
    account: app.node.tryGetContext("account"),
    region: app.node.tryGetContext("region")
}
if (env.account==null || env.region==null){
    throw Error("Specify account and region via cdk context")
}
new Stacks(app, 'AwsLambdaFanoutStack', {
    env: env
});
Aspects.of(app).add(new AwsSolutionsChecks())
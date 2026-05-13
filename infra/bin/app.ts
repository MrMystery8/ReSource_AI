#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ResourceAiStack } from '../lib/resource-ai-stack';

const app = new cdk.App();

new ResourceAiStack(app, 'ResourceAiStack', {
  description: 'ReSource AI E-Waste Triage System',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-southeast-1',
  },
});

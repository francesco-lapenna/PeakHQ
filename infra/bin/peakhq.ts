import * as cdk from 'aws-cdk-lib';
import { PeakHQApiStack } from '../lib/peakhq-api-stack';
import { PeakHQAuthStack } from '../lib/peakhq-auth-stack';
import { PeakHQDataStack } from '../lib/peakhq-data-stack';
import { PeakHQFrontendStack } from '../lib/peakhq-frontend-stack';

const app = new cdk.App();
const env = { region: 'eu-south-1' };

const authStack = new PeakHQAuthStack(app, 'PeakHQAuthStack', { env });
const dataStack = new PeakHQDataStack(app, 'PeakHQDataStack', { env });

const apiStack = new PeakHQApiStack(app, 'PeakHQApiStack', {
  env,
  table: dataStack.table,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});

new PeakHQFrontendStack(app, 'PeakHQFrontendStack', {
  env,
  apiUrl: apiStack.apiUrl,
});

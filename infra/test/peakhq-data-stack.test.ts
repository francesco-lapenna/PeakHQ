import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PeakHQDataStack } from '../lib/peakhq-data-stack';

describe('PeakHQDataStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new PeakHQDataStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  it('matches snapshot', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });

  it('creates a DynamoDB table with PAY_PER_REQUEST billing', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'PeakHQ-prod',
      BillingMode: 'PAY_PER_REQUEST',
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    });
  });

  it('creates GSI1 with ALL projection', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: [
        {
          IndexName: 'GSI1',
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    });
  });

  it('has RETAIN deletion policy to protect user data', () => {
    template.hasResource('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });
});

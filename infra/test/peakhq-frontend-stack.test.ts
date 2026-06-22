import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PeakHQFrontendStack } from '../lib/peakhq-frontend-stack';

describe('PeakHQFrontendStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new PeakHQFrontendStack(app, 'TestStack', {
      apiUrl: 'fake-api-id.execute-api.eu-south-1.amazonaws.com',
    });
    template = Template.fromStack(stack);
  });

  it('matches snapshot', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });

  it('creates an S3 bucket with public access blocked', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it('has RETAIN deletion policy on the S3 bucket', () => {
    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  it('creates a CloudFront distribution with SPA routing', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultRootObject: 'index.html',
        CustomErrorResponses: [
          { ErrorCode: 403, ResponseCode: 200, ResponsePagePath: '/index.html' },
          { ErrorCode: 404, ResponseCode: 200, ResponsePagePath: '/index.html' },
        ],
      },
    });
  });
});

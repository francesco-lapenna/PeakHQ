import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PeakHQApiStack } from '../lib/peakhq-api-stack';
import { PeakHQAuthStack } from '../lib/peakhq-auth-stack';
import { PeakHQDataStack } from '../lib/peakhq-data-stack';

describe('PeakHQApiStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const authStack = new PeakHQAuthStack(app, 'AuthStack');
    const dataStack = new PeakHQDataStack(app, 'DataStack');
    const stack = new PeakHQApiStack(app, 'TestStack', {
      table: dataStack.table,
      userPool: authStack.userPool,
      userPoolClient: authStack.userPoolClient,
    });
    template = Template.fromStack(stack);
  });

  it('matches snapshot', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });

  it('creates exactly 7 Lambda functions', () => {
    template.resourceCountIs('AWS::Lambda::Function', 7);
  });

  it('creates an HTTP API', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      ProtocolType: 'HTTP',
    });
  });

  it('creates a JWT authorizer', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Authorizer', {
      AuthorizerType: 'JWT',
    });
  });

  it('sets Lambda memory to 128 MB and timeout to 29 s', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 128,
      Timeout: 29,
    });
  });
});

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PeakHQAuthStack } from '../lib/peakhq-auth-stack';

describe('PeakHQAuthStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new PeakHQAuthStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  it('matches snapshot', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });

  it('creates a Cognito UserPool with self-signup disabled', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
      UserPoolName: 'peakhq-user-pool',
    });
  });

  it('creates a UserPoolClient without a secret (public PKCE client)', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      GenerateSecret: false,
    });
  });

  it('creates a Cognito domain', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
      Domain: 'peakhq-auth',
    });
  });
});

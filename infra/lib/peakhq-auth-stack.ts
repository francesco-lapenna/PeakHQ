import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class PeakHQAuthStack extends Stack {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'peakhq-user-pool',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      generateSecret: false,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: [
          'http://localhost:5173/auth/callback',
          'https://dygybi8tyva9o.cloudfront.net/auth/callback',
        ],
        logoutUrls: ['http://localhost:5173', 'https://dygybi8tyva9o.cloudfront.net'],
      },
      authFlows: { userSrp: true },
    });

    new cognito.UserPoolDomain(this, 'Domain', {
      userPool: this.userPool,
      cognitoDomain: { domainPrefix: 'peakhq-auth' },
    });

    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new CfnOutput(this, 'CognitoDomain', {
      value: `peakhq-auth.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito Hosted UI domain',
    });
  }
}

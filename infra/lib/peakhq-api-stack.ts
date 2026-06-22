import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

interface ApiStackProps extends StackProps {
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

export class PeakHQApiStack extends Stack {
  readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { table, userPool, userPoolClient } = props;

    const handlersDir = path.join(__dirname, '../../backend/src/handlers');

    const commonProps = {
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 128,
      timeout: Duration.seconds(29),
      environment: { TABLE_NAME: table.tableName },
      bundling: { minify: true },
    };

    const profileFn = new NodejsFunction(this, 'ProfileHandler', {
      ...commonProps,
      entry: path.join(handlersDir, 'profile-handler.ts'),
    });
    const exercisesFn = new NodejsFunction(this, 'ExercisesHandler', {
      ...commonProps,
      entry: path.join(handlersDir, 'exercises-handler.ts'),
    });
    const programsFn = new NodejsFunction(this, 'ProgramsHandler', {
      ...commonProps,
      entry: path.join(handlersDir, 'programs-handler.ts'),
    });
    const sessionsFn = new NodejsFunction(this, 'SessionsHandler', {
      ...commonProps,
      entry: path.join(handlersDir, 'sessions-handler.ts'),
    });
    const nutritionFn = new NodejsFunction(this, 'NutritionHandler', {
      ...commonProps,
      entry: path.join(handlersDir, 'nutrition-handler.ts'),
    });
    const trackingFn = new NodejsFunction(this, 'TrackingHandler', {
      ...commonProps,
      entry: path.join(handlersDir, 'tracking-handler.ts'),
    });
    const exportFn = new NodejsFunction(this, 'ExportHandler', {
      ...commonProps,
      entry: path.join(handlersDir, 'export-handler.ts'),
    });

    [profileFn, exercisesFn, programsFn, sessionsFn, nutritionFn, trackingFn, exportFn].forEach(
      (fn) => table.grantReadWriteData(fn),
    );

    const api = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: 'peakhq-api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowHeaders: ['Authorization', 'Content-Type'],
      },
    });

    const authorizer = new HttpJwtAuthorizer('JwtAuthorizer', userPool.userPoolProviderUrl, {
      jwtAudience: [userPoolClient.userPoolClientId],
    });

    const addRoutes = (paths: string[], methods: apigatewayv2.HttpMethod[], fn: NodejsFunction) => {
      paths.forEach((p) =>
        api.addRoutes({
          path: p,
          methods,
          integration: new HttpLambdaIntegration(`${fn.node.id}Integration-${p}`, fn),
          authorizer,
        }),
      );
    };

    const { GET, POST, PUT, PATCH, DELETE } = apigatewayv2.HttpMethod;

    addRoutes(['/api/profile'], [GET, PUT], profileFn);
    addRoutes(['/api/profile/active-program', '/api/profile/active-meal-plan'], [PATCH], profileFn);

    addRoutes(['/api/exercises'], [GET, POST], exercisesFn);
    addRoutes(['/api/exercises/{id}'], [PUT, DELETE], exercisesFn);
    addRoutes(['/api/exercises/{id}/progression'], [GET], exercisesFn);

    addRoutes(['/api/programs'], [GET, POST], programsFn);
    addRoutes(['/api/programs/{id}'], [GET, PUT, DELETE], programsFn);
    addRoutes(['/api/programs/{id}/days/{dayId}'], [POST, PUT, DELETE], programsFn);
    addRoutes(['/api/programs/{id}/days/reorder'], [PATCH], programsFn);

    addRoutes(['/api/sessions'], [GET, POST], sessionsFn);
    addRoutes(['/api/sessions/{id}'], [GET, PATCH, DELETE], sessionsFn);
    addRoutes(['/api/sessions/{id}/sets/{setId}'], [POST, PUT, DELETE], sessionsFn);

    addRoutes(['/api/meal-plans'], [GET, POST], nutritionFn);
    addRoutes(['/api/meal-plans/{id}'], [GET, PUT, DELETE], nutritionFn);
    addRoutes(['/api/meal-plans/{id}/meals/{mealId}'], [POST, PUT, DELETE], nutritionFn);
    addRoutes(['/api/favourites'], [GET, POST], nutritionFn);
    addRoutes(['/api/favourites/{offId}'], [DELETE], nutritionFn);

    addRoutes(['/api/body-weight'], [GET], trackingFn);
    addRoutes(['/api/body-weight/{date}'], [PUT, DELETE], trackingFn);
    addRoutes(['/api/weekly-logs'], [GET], trackingFn);
    addRoutes(['/api/weekly-logs/{weekStart}'], [PUT], trackingFn);

    addRoutes(['/api/export'], [GET], exportFn);

    // Strip the https:// prefix for use as a CloudFront origin hostname
    this.apiUrl = api.apiEndpoint.replace('https://', '');
  }
}

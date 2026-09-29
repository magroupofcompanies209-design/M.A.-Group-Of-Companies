import serverless from 'serverless-http';
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import app from '../../server.ts';

const serverlessHandler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/octet-stream'],
});

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Prevent AWS Lambda / Netlify execution from waiting for open PostgreSQL pool handles before freezing/responding
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  try {
    const response = await serverlessHandler(event, context);
    return response as any;
  } catch (error: any) {
    console.error('[Netlify API Function Error]:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'NetlifyFunctionError',
        message: error?.message || 'Internal Serverless Handler Error',
      }),
    };
  }
};

export default handler;

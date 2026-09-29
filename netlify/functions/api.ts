import serverless from 'serverless-http';
import type { Config, Handler } from '@netlify/functions';
import app from '../../server/app.ts';

const serverlessHandler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/octet-stream'],
});

// Configure Netlify Functions v2 path matching
export const config: Config = {
  path: ['/api', '/api/*'],
  preferStatic: false,
};

// Universal Serverless Handler supporting both Netlify v1 (event) and Netlify v2 (Request)
export const handler: Handler = async (eventOrRequest: any, context?: any) => {
  if (context && typeof context === 'object') {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  try {
    // If invoked with a Web Standard Request (Netlify Functions v2)
    if (
      eventOrRequest &&
      (typeof eventOrRequest.arrayBuffer === 'function' ||
        typeof eventOrRequest.text === 'function' ||
        typeof eventOrRequest.json === 'function') &&
      typeof eventOrRequest.method === 'string'
    ) {
      const req = eventOrRequest as Request;
      const url = new URL(req.url);
      const headers: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const body =
        req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined;

      const event = {
        httpMethod: req.method,
        path: url.pathname,
        rawUrl: req.url,
        rawQuery: url.search.replace(/^\?/, ''),
        headers,
        queryStringParameters: Object.fromEntries(url.searchParams),
        body: body || null,
        isBase64Encoded: false,
      };

      const res: any = await serverlessHandler(event as any, context || {});
      const responseHeaders = new Headers();
      if (res.headers) {
        for (const [key, value] of Object.entries(res.headers)) {
          if (value !== undefined) {
            responseHeaders.set(key, String(value));
          }
        }
      }
      if (res.multiValueHeaders) {
        for (const [key, values] of Object.entries(res.multiValueHeaders)) {
          if (Array.isArray(values)) {
            for (const v of values) {
              responseHeaders.append(key, v);
            }
          }
        }
      }

      return new Response(res.body, {
        status: res.statusCode || 200,
        headers: responseHeaders,
      }) as any;
    }

    // Traditional Netlify Functions v1 / AWS Lambda HandlerEvent
    const response = await serverlessHandler(eventOrRequest, context || {});
    return response as any;
  } catch (error: any) {
    console.error('[Netlify API Function Error]:', error);
    const errorBody = JSON.stringify({
      success: false,
      error: 'NetlifyFunctionError',
      message: error?.message || 'Internal Serverless Handler Error',
    });

    if (
      eventOrRequest &&
      typeof eventOrRequest.arrayBuffer === 'function' &&
      typeof eventOrRequest.method === 'string'
    ) {
      return new Response(errorBody, {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }) as any;
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: errorBody,
    };
  }
};

export default handler;

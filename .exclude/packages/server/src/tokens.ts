import { InjectionToken } from '@nest/core';
import { HttpServer, HttpServerOptions } from './interfaces';

export const PATH_METADATA = Symbol.for('Metadata<Path>');

export const HTTP_SERVER = new InjectionToken<HttpServer>('HTTP_SERVER');
export const HTTP_SERVER_OPTIONS = new InjectionToken<HttpServerOptions>(
  'HTTP_SERVER_OPTIONS',
);

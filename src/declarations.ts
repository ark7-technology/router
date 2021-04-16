import * as _ from 'underscore';
import * as Router from 'koa-router';

export enum Method {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
}

/**
 * Options to define a handler.
 */
export interface IHandlerOptions {
  method?: Method;
  path?: string;
  name?: string;
  middleware?: Router.IMiddleware | Router.IMiddleware[];
}

/**
 * Metadata injected to the A7Controller class.
 */
export interface IA7ControllerMetadata {
  /** Global middlewares applied to all the handlers. */
  middlewares: Router.IMiddleware[];

  /** Handlers under the current controller. */
  handlers: {
    [name: string]: IA7HandlerMetadata;
  };

  /** Koa router options. */
  routerOptions: Router.IRouterOptions;
}

export interface IA7HandlerMetadata {
  method: Method;
  path: string;
  middleware: Router.IMiddleware;
  name?: string;
}

export const METADATA_KEY = 'ark7:router:metadata';

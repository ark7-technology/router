import * as _ from 'underscore';
import * as Router from 'koa-router';

import {
  A7ControllerMetadata,
  A7ControllerSubsidiaryType,
  METADATA_KEY,
  Method,
} from './declarations';
import { Middleware } from './decorators';

/**
 * Options to define a handler.
 */
export interface HandlerOptions {
  method?: Method;
  path?: string;
  name?: string;
  middleware?: Router.IMiddleware | Router.IMiddleware[];
}

export function Handler(
  options: HandlerOptions = {},
): PropertyDecorator & MethodDecorator {
  const m = Middleware([]) as MethodDecorator;

  return (
    target: any,
    propertyKey: string,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    const desc = m(target, propertyKey, descriptor);

    const cls = target.constructor;
    const meta = A7ControllerMetadata.getMetadata(cls);
    const subsidiary = meta.getOrCreateSubsidiary(propertyKey, '/');

    subsidiary.type = A7ControllerSubsidiaryType.HANDLER;

    if (options.middleware) {
      subsidiary.pushMiddlewaresInFront(_.flatten([options.middleware]));
    }

    if (options.method) {
      subsidiary.method = options.method;
    }

    if (options.path) {
      subsidiary.path = options.path;
    }

    if (options.name) {
      subsidiary.name = options.name;
    }

    Reflect.defineMetadata(METADATA_KEY, meta, cls);

    return desc;
  };
}

export function Get(
  path: string,
  options: HandlerOptions = {},
): PropertyDecorator {
  return Handler(
    _.extend({}, options, {
      path,
      method: Method.GET,
    }),
  );
}

export function Post(
  path: string,
  options: HandlerOptions = {},
): PropertyDecorator {
  return Handler(
    _.extend({}, options, {
      path,
      method: Method.POST,
    }),
  );
}

export function Put(
  path: string,
  options: HandlerOptions = {},
): PropertyDecorator {
  return Handler(
    _.extend({}, options, {
      path,
      method: Method.PUT,
    }),
  );
}

export function Delete(
  path: string,
  options: HandlerOptions = {},
): PropertyDecorator {
  return Handler(
    _.extend({}, options, {
      path,
      method: Method.DELETE,
    }),
  );
}

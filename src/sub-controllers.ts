import * as Router from 'koa-router';

import {
  A7ControllerMetadata,
  A7ControllerSubsidiaryType,
} from './declarations';
import { Middleware } from './decorators';

/**
 * Options to define a handler.
 */
export interface SubControllerOptions {
  path?: string;
  name?: string;
  middlewares?: Router.IMiddleware[];
}

export function SubController(
  options: SubControllerOptions = {},
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
    const subsidiary = meta.getOrCreateSubsidiary(propertyKey);

    subsidiary.type = A7ControllerSubsidiaryType.SUB_CONTROLLER;

    if (options.middlewares) {
      subsidiary.pushMiddlewaresInFront(options.middlewares);
    }

    if (options.path) {
      subsidiary.path = options.path;
    }

    if (options.name) {
      subsidiary.name = options.name;
    }

    meta.defineMetadata(cls);

    return desc;
  };
}

import 'reflect-metadata';

import * as _ from 'underscore';
import * as Router from 'koa-router';

import { A7Controller } from './controller';
import {
  A7ControllerMetadata,
  A7ControllerSubsidiary,
  A7ControllerSubsidiaryType,
} from './declarations';
import { a7RouterConfig } from './global-config';

/**
 * A decorator to config a router class.
 */
export function Config(options: Router.IRouterOptions) {
  return (cls: any) => {
    const meta = A7ControllerMetadata.getMetadata(cls);
    meta.extendOptions(options);
    meta.defineMetadata(cls);
  };
}

export function Middleware(
  middlewares: Router.IMiddleware | Router.IMiddleware[],
): ClassDecorator & PropertyDecorator & MethodDecorator {
  middlewares = _.chain([middlewares])
    .flatten()
    .map(a7RouterConfig.middlewareMapper)
    .value();

  return (
    target: any,
    propertyKey?: string,
    descriptor?: TypedPropertyDescriptor<any>,
  ): any => {
    if (propertyKey == null) {
      buildConstructorMiddleware(target, middlewares as Router.IMiddleware[]);
    } else {
      return buildPropertyMiddleware(
        target,
        propertyKey,
        middlewares as Router.IMiddleware[],
        descriptor,
      );
    }
  };
}

function buildConstructorMiddleware(
  cls: any,
  middlewares: Router.IMiddleware[],
) {
  A7ControllerMetadata.getMetadata(cls)
    .clone()
    .pushMiddlewaresInFront(middlewares)
    .defineMetadata(cls);
}

function getDescription(handler: A7ControllerSubsidiary) {
  return {
    get: function () {
      return handler.composedMiddleware;
    },
    set: function (fn: Router.IMiddleware | typeof A7Controller) {
      if (fn.prototype instanceof A7Controller) {
        handler.cls = fn as typeof A7Controller;
        handler.type = A7ControllerSubsidiaryType.SUB_CONTROLLER;
      } else {
        handler.pushMiddlewaresBack(_.flatten([fn as Router.IMiddleware]));
        handler.type = A7ControllerSubsidiaryType.HANDLER;
      }
    },
    enumerable: false,
    configurable: true,
    _a7: true,
  };
}

function buildPropertyMiddleware(
  target: any,
  propertyKey: string,
  middlewares: Router.IMiddleware[],
  descriptor: TypedPropertyDescriptor<Router.IMiddleware>,
) {
  const cls = target.constructor;
  const meta = A7ControllerMetadata.getMetadata(cls).clone();

  const subsidiary = meta.getOrCreateSubsidiary(propertyKey);

  subsidiary.pushMiddlewaresInFront(middlewares);

  if (descriptor != null && !(descriptor as any)._a7) {
    subsidiary.pushMiddlewaresBack([descriptor.value]);
  }

  meta.defineMetadata(cls);

  if (descriptor != null && !(descriptor as any)._a7) {
    return getDescription(subsidiary);
  }
}

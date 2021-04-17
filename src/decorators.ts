import 'reflect-metadata';

import * as _ from 'underscore';
import * as Router from 'koa-router';

import {
  A7ControllerMetadata,
  A7HandlerMetadata,
  IHandlerOptions,
  METADATA_KEY,
  Method,
} from './declarations';
import { a7RouterConfig } from './global-config';
import { isPromise } from './utils';

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

export function Handler(options: IHandlerOptions = {}): PropertyDecorator {
  return (target: any, propertyKey: string) => {
    const cls = target.constructor;
    const meta = A7ControllerMetadata.getMetadata(cls);
    const handler = meta.getOrCreateHandler(propertyKey, '/');

    if (options.middleware) {
      handler.pushMiddlewaresInFront(_.flatten([options.middleware]));
    }

    if (options.method) {
      handler.method = options.method;
    }

    if (options.path) {
      handler.path = options.path;
    }

    if (options.name) {
      handler.name = options.name;
    }

    Reflect.defineMetadata(METADATA_KEY, meta, cls);
  };
}

export function Get(
  path: string,
  options: IHandlerOptions = {},
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
  options: IHandlerOptions = {},
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
  options: IHandlerOptions = {},
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
  options: IHandlerOptions = {},
): PropertyDecorator {
  return Handler(
    _.extend({}, options, {
      path,
      method: Method.DELETE,
    }),
  );
}

export function Middleware(
  middlewares: Router.IMiddleware | Router.IMiddleware[],
): ClassDecorator & PropertyDecorator {
  middlewares = _.chain([middlewares])
    .flatten()
    .map(a7RouterConfig.middlewareMapper)
    .value();

  return (
    target: any,
    propertyKey?: string,
    descriptor?: TypedPropertyDescriptor<Router.IMiddleware>,
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

/**
 * A IF middleware that helps a branch checking.  Usage:
 *
 *     @If(predictor, ifClause)
 *     - execute ifClause when predictor returns true.
 *     - execute next middleware when predictor returns false.
 *
 *     @If(predictor, ifClause, elseClause)
 *     - execute ifClause when predictor returns true.
 *     - execute elseClause when predictor returns false.
 *
 * @param predictor - Predict which clause to execute.
 * @param ifClause - Execute when predictor returns true.
 * @param elseClause - Execute when predictor returns false. By default, execute
 *                     else clause.
 */
export function If(
  predictor: (ctx: Router.IRouterContext) => boolean | Promise<boolean>,
  ifClause: Router.IMiddleware,
  elseClause?: Router.IMiddleware,
) {
  return Middleware(async (ctx: Router.IRouterContext, next: () => any) => {
    const value = predictor(ctx);
    const boolValue = isPromise(value) ? await value : value;

    if (boolValue) {
      await ifClause(ctx, next);
    } else if (elseClause) {
      await elseClause(ctx, next);
    } else {
      await next();
    }
  });
}

/**
 * A WHEN middleware that helps a branch checking, next middleware will always
 * be executed regardless what predictor returns.
 *
 * @param predictor - Predict when the when clause will be executed.
 * @param whenClause - Execute when predictor returns true.
 */
export function When(
  predictor: (ctx: Router.IRouterContext) => boolean | Promise<boolean>,
  whenClause: Router.IMiddleware,
) {
  return Middleware(async (ctx: Router.IRouterContext, next: () => any) => {
    const value = predictor(ctx);
    const boolValue = isPromise(value) ? await value : value;

    if (boolValue && whenClause) {
      await whenClause(ctx, () => Promise.resolve({}));
    }

    await next();
  });
}

/**
 * A CHECK middleware that helps determines if to execute next middleware.
 * Usage:
 *
 *   @Check((ctx: Router.IRouterContext) => ctx.isAuthenticated())
 *
 * @param predictor - Returns true to execute next middleware.
 */
export function Check(
  predictor: (ctx: Router.IRouterContext) => boolean | Promise<boolean>,
) {
  return Middleware(async (ctx: Router.IRouterContext, next: () => any) => {
    const value = predictor(ctx);
    const boolValue = isPromise(value) ? await value : value;

    if (boolValue) {
      await next();
    }
  });
}

/**
 * A Tee middleware that helps execute a side function.
 * Usage:
 *
 *   @Tee((ctx: Router.IRouterContext) => console.log(ctx.path))
 *
 * @param fn - The side function to execute.
 * @param opts.post - specifies run tee after returned.
 */
export function Tee(
  fn: (ctx: Router.IRouterContext, next: () => any) => void | Promise<void>,
  opts: TeeOptions = {},
) {
  async function process(ctx: Router.IRouterContext) {
    const value = fn(ctx, () => {});
    if (isPromise(value)) {
      await value;
    }
  }

  return Middleware(async (ctx: Router.IRouterContext, next: () => any) => {
    if (!opts.post) {
      await process(ctx);
    }
    await next();
    if (opts.post) {
      await process(ctx);
    }
  });
}

export interface TeeOptions {
  post?: boolean;
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

function getDescription(handler: A7HandlerMetadata) {
  return {
    get: function () {
      return handler.composedMiddleware;
    },
    set: function (fn: Router.IMiddleware) {
      handler.pushMiddlewaresBack(_.flatten([fn]));
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

  const handler = meta.getOrCreateHandler(propertyKey);

  handler.pushMiddlewaresInFront(middlewares);

  if (descriptor != null && !(descriptor as any)._a7) {
    handler.pushMiddlewaresBack([descriptor.value]);
  }

  meta.defineMetadata(cls);

  if (!(descriptor as any)?._a7) {
    return getDescription(handler);
  }
}

import * as Router from 'koa-router';

import { Middleware } from './decorators';
import { isPromise } from './utils';

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

export function TeePost(
  fn: (ctx: Router.IRouterContext, next: () => any) => void | Promise<void>,
) {
  return Tee(fn, { post: true });
}

export interface TeeOptions {
  post?: boolean;
}

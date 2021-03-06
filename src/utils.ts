import * as _ from 'underscore';
import * as Router from 'koa-router';
import debug from 'debug';

const d = debug('ark7:router:utils');

/**
 * Compose `middleware` returning a fully valid middleware comprised of all
 * those which are passed.
 */
export function compose(
  middleware: Router.IMiddleware | Router.IMiddleware[],
): Router.IMiddleware {
  if (_.isFunction(middleware)) {
    return middleware;
  }

  if (!Array.isArray(middleware)) {
    throw new TypeError('Middleware stack must be an array!');
  }

  for (const fn of middleware) {
    if (typeof fn !== 'function') {
      throw new TypeError('Middleware must be composed of functions!');
    }
  }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */

  return function (context: any, next: Function) {
    // last called middleware #
    let index = -1;
    const rid = `${context.request.method} ${context.request.path} ${context.requestId}`;

    return dispatch.call(this, 0);

    function dispatch(i: number) {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'));
      }

      index = i;

      const fn = i === middleware.length ? next : (middleware as Function[])[i];

      if (!fn) return Promise.resolve();

      const start = _.now();
      const name = fn.name || '<anonymous>';

      try {
        if (name !== 'bound dispatch') {
          d('[%O] Begin of middleware %O', rid, name);
        }
        return Promise.resolve(
          fn.call(this, context, dispatch.bind(this, i + 1)),
        );
      } catch (err) {
        return Promise.reject(err);
      } finally {
        const end = _.now();
        if (name !== 'bound dispatch') {
          d('[%O] End of middleware %O, duration: %O', rid, name, end - start);
        }
      }
    }
  };
}

export function isPromise<T>(promise: any): promise is Promise<T> {
  return promise && promise.then != null;
}

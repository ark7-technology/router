import * as _ from 'underscore';
import * as Router from 'koa-router';

export interface A7RouterConfig {
  middlewareMapper: (m: Router.IMiddleware) => Router.IMiddleware;
}

export const a7RouterConfig: A7RouterConfig = {
  middlewareMapper: _.identity,
};

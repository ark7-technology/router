import 'reflect-metadata';

import * as _ from 'underscore';
import * as Router from 'koa-router';

import { A7ControllerMetadata, METADATA_KEY } from './declarations';

/**
 * Base class of the Ark7 Controller.
 */
export class A7Controller {
  get $koaRouter(): Router {
    const meta: A7ControllerMetadata = Reflect.getMetadata(
      METADATA_KEY,
      this.constructor,
    );

    return meta?.$koaRouter;
  }

  get $koaRouterUseArgs(): [Router.IMiddleware, Router.IMiddleware] {
    return [this.$koaRouter.routes(), this.$koaRouter.allowedMethods()];
  }
}

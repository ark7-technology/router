import 'reflect-metadata';

import * as _ from 'underscore';
import * as Router from 'koa-router';

import { compose } from './utils';

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
export class A7ControllerMetadata {
  private $_router: Router;

  constructor(
    /** Global middlewares applied to all the handlers. */
    private middlewares: Router.IMiddleware[] = [],
    /** Subsidiaries under the current controller. */
    private subsidiaries: A7ControllerSubsidiary[] = [],
    /** Koa router options. */
    private routerOptions: Router.IRouterOptions = {},
  ) {}

  static getMetadata(cls: any): A7ControllerMetadata {
    return Reflect.getMetadata(METADATA_KEY, cls) ?? new A7ControllerMetadata();
  }

  get $koaRouter(): Router {
    if (this.$_router != null) {
      return this.$_router;
    }

    this.$_router = new Router(this.routerOptions);

    if (!_.isEmpty(this.middlewares)) {
      this.$_router.use(compose(this.middlewares));
    }

    for (const subsidiary of this.subsidiaries) {
      if (subsidiary instanceof A7HandlerMetadata) {
        const handlerMeta = subsidiary;
        const name = handlerMeta.name;

        let method = (this as any)[name] || _.identity;

        if (!_.isEmpty(handlerMeta.middlewares)) {
          method = compose([...handlerMeta.middlewares, method]);
          (this as any)[name] = method;
        }

        if (handlerMeta.path != null) {
          (this.$_router as any)[handlerMeta.method](
            handlerMeta.name,
            handlerMeta.path,
            method.bind(this),
          );
        }
      }
    }

    return this.$_router;
  }

  extendOptions(options: Router.IRouterOptions): this {
    _.extend(this.routerOptions, options);
    return this;
  }

  defineMetadata(cls: any): this {
    Reflect.defineMetadata(METADATA_KEY, this, cls);
    return this;
  }

  pushMiddlewaresInFront(middlewares: Router.IMiddleware[]): this {
    this.middlewares = _.union(middlewares, this.middlewares);
    return this;
  }

  clone(): A7ControllerMetadata {
    return new A7ControllerMetadata(
      _.clone(this.middlewares),
      _.clone(this.subsidiaries),
      _.clone(this.routerOptions),
    );
  }

  getSubsidiaryByName(name: string): A7ControllerSubsidiary {
    return _.find(this.subsidiaries, (s) => s.name === name);
  }

  getOrCreateHandler(name: string, path?: string): A7HandlerMetadata {
    let subsidiary = this.getSubsidiaryByName(name);
    if (subsidiary != null && !(subsidiary instanceof A7HandlerMetadata)) {
      throw new Error(`Subsidiary ${name} is not a handler`);
    }

    if (subsidiary == null) {
      subsidiary = new A7HandlerMetadata(name);
      this.subsidiaries.push(subsidiary);
    }

    if (path != null) {
      subsidiary.path = path;
    }

    return subsidiary as A7HandlerMetadata;
  }
}

export class A7HandlerMetadata {
  method: Method;
  path: string;
  middlewares: Router.IMiddleware[] = [];

  constructor(public name: string) {}

  get composedMiddleware(): Router.IMiddleware {
    return compose(this.middlewares);
  }

  pushMiddlewaresInFront(middlewares: Router.IMiddleware[]): this {
    this.middlewares = _.union(middlewares, this.middlewares);
    return this;
  }

  pushMiddlewaresBack(middlewares: Router.IMiddleware[]): this {
    this.middlewares = _.union(this.middlewares, middlewares);
    return this;
  }
}

export class SubControllerMetadata {
  path?: string;
  cls: any;

  constructor(public name: string) {}
}

export type A7ControllerSubsidiary = A7HandlerMetadata | SubControllerMetadata;

export const METADATA_KEY = 'ark7:router:metadata';

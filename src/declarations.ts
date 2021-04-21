import 'reflect-metadata';

import * as _ from 'underscore';
import * as Router from 'koa-router';

import { A7Controller } from './controller';
import { compose } from './utils';

export enum Method {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
}

export function injectHandler(handler: string) {
  return async (ctx: any, next: any) => {
    ctx.handler = handler;
    await next();
  };
}

/**
 * Metadata injected to the A7Controller class.
 */
export class A7ControllerMetadata {
  constructor(
    private className: string,
    /** Global middlewares applied to all the handlers. */
    private middlewares: Router.IMiddleware[] = [],
    /** Subsidiaries under the current controller. */
    private subsidiaries: A7ControllerSubsidiary[] = [],
    /** Koa router options. */
    private routerOptions: Router.IRouterOptions = {},
  ) {}

  static getMetadata(cls: any): A7ControllerMetadata {
    return (
      Reflect.getMetadata(METADATA_KEY, cls) ??
      new A7ControllerMetadata(cls.name)
    );
  }

  koaRouter(controller: A7Controller): Router {
    const koaRouter = new Router(this.routerOptions);

    if (!_.isEmpty(this.middlewares)) {
      koaRouter.use(compose(this.middlewares));
    }

    for (const subsidiary of this.subsidiaries) {
      switch (subsidiary.type) {
        case A7ControllerSubsidiaryType.HANDLER:
          if (subsidiary.path != null) {
            (koaRouter as any)[subsidiary.method](
              subsidiary.name,
              subsidiary.path,
              compose([
                injectHandler(`${this.className}.${subsidiary.name}`),
                subsidiary.composedMiddleware,
              ]).bind(controller),
            );
          }
          break;

        case A7ControllerSubsidiaryType.SUB_CONTROLLER:
          const router = new Router({
            prefix: subsidiary.path,
          });

          if (!_.isEmpty(subsidiary.middlewares)) {
            router.use(subsidiary.composedMiddleware.bind(controller));
          }

          const subController = new subsidiary.cls();
          router.use(...subController.$koaRouterUseArgs);

          koaRouter.use(router.routes(), router.allowedMethods());
          break;
      }
    }

    return koaRouter;
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
      this.className,
      _.clone(this.middlewares),
      _.clone(this.subsidiaries),
      _.clone(this.routerOptions),
    );
  }

  getSubsidiaryByName(name: string): A7ControllerSubsidiary {
    return _.find(this.subsidiaries, (s) => s.name === name);
  }

  getOrCreateSubsidiary(name: string, path?: string): A7ControllerSubsidiary {
    let subsidiary = this.getSubsidiaryByName(name);

    if (subsidiary == null) {
      subsidiary = new A7ControllerSubsidiary(name);
      this.subsidiaries.push(subsidiary);
    }

    if (path != null) {
      subsidiary.path = path;
    }

    return subsidiary;
  }
}

export enum A7ControllerSubsidiaryType {
  HANDLER = 'HANDLER',
  SUB_CONTROLLER = 'SUB_CONTROLLER',
}

export class A7ControllerSubsidiary {
  type?: A7ControllerSubsidiaryType;
  path?: string;
  middlewares: Router.IMiddleware[] = [];

  method?: Method;
  cls?: typeof A7Controller;

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

export const METADATA_KEY = 'ark7:router:metadata';

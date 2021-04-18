import 'should';

import { A7Controller, Config, Get, Middleware, SubController } from '../src';

@Config({
  prefix: '/abcd',
})
class NestedController extends A7Controller {
  @Get('/foo')
  async foo() {}
}

async function test(_ctx: any, next: any) {
  await next();
}

@Middleware(test)
class Controller extends A7Controller {
  @Middleware(async function (
    this: Controller,
    ctx: any,
    next: () => Promise<void>,
  ) {
    if (this != null && this instanceof Controller) {
      ctx.values.push('m1');
    }
    await next();
  })
  async m2(ctx: any, next: () => Promise<void>) {
    if (this != null) {
      ctx.values.push('m2');
    }
    await next();
  }

  @Get('/')
  @Middleware(Controller.prototype.m2)
  @Middleware(async (ctx: any, next: () => Promise<void>) => {
    if (this != null) {
      ctx.values.push('m3');
    }
    await next();
  })
  async m4(ctx: any, next: () => Promise<void>) {
    if (this != null) {
      ctx.values.push('m4');
    }
    await next();
  }

  @Get('/')
  @Middleware(Controller.prototype.m4)
  @Middleware(Controller.prototype.m6)
  m5 = async (ctx: any) => {
    if (this != null) {
      ctx.values.push('m5');
    }
  };

  async m6(ctx: any, next: () => Promise<void>) {
    await next();
    if (this != null) {
      ctx.values.push('m6');
    }
    this.m7(ctx);
  }

  async m7(ctx: any) {
    if (this != null) {
      ctx.values.push('m7');
    }
  }

  @Middleware(Controller.prototype.m4)
  @Middleware(Controller.prototype.m5)
  async m8(ctx: any) {
    if (this != null) {
      ctx.values.push('m8');
    }
  }

  @SubController({
    path: '/bar',
  })
  @Middleware(Controller.prototype.m7)
  nested = NestedController;
}

const controller = new Controller();

controller.$koaRouterUseArgs;

describe('koa.controller', () => {
  it('should create middlewares', async () => {
    const ctx: any = { values: [], request: {} };
    await controller.m4(ctx, async function () {});
    ctx.values.should.deepEqual(['m1', 'm2', 'm3', 'm4']);
  });

  it('should create with empty middlewares', async () => {
    const ctx: any = { values: [], request: {} };
    await controller.m5(ctx);
    ctx.values.should.deepEqual(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7']);
  });

  it('should create with nested middlewares', async () => {
    const ctx: any = { values: [], request: {} };
    await controller.m8(ctx);
    ctx.values.should.deepEqual([
      'm1',
      'm2',
      'm3',
      'm4',
      'm1',
      'm2',
      'm3',
      'm4',
      'm8',
      'm6',
      'm7',
    ]);
  });

  it('should create nested controller', async () => {
    controller.$koaRouter.match('/bar/abcd/foo', 'GET').route.should.be.true();
    controller.$koaRouter
      .match('/bar/abcd/foo2', 'GET')
      .route.should.be.false();
  });
});

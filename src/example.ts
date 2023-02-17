import { A7Controller } from './controller';
import { Middleware } from './decorators';

export class Controller extends A7Controller {
  async m4() {}

  @Middleware(Controller.prototype.m4)
  m5 = async (_ctx: any) => {};
}

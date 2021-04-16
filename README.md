# @ark7/router

> `@ark7/router` is class-oriented routing framework which is built on top of [koa](https://koajs.com/) and [koa-router](https://github.com/koajs/router).

## Usage

### Basic Usage

```typescript
@Config({
  prefix: '/users',
})
class User extends A7Controller {
  @Post('/')
  create = models.Users.createMiddleware({});

  @Get('/')
  @Permission({ roles: [Roles.ADMIN] })
  find = models.Users.findMiddleware({});

  @SubController('/users/:userId/topics')
  topics = Topics;
}
```

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../util';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: User }>();
    return request.user;
  },
);

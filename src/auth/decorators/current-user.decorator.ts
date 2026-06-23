import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '$gen/prisma-class/user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    return ctx.switchToHttp().getRequest<{ user: User }>().user;
  },
);

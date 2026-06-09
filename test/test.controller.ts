import { Controller, Get, Post, Body } from '@nestjs/common';
import { TestCreateDto } from './test.dto';

@Controller('test')
export class TestController {
  @Get()
  test() {
    return { hello: 'world', number: 42 };
  }

  @Post()
  create(@Body() dto: TestCreateDto) {
    return { received: dto };
  }
}

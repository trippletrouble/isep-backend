import { ApiProperty } from '@nestjs/swagger';
import { Session } from '../../../generated/prisma-class/session';

export class ListSessionsResponseDto {
  @ApiProperty({ type: [Session] })
  items: Session[];

  @ApiProperty({ type: Number })
  page: number;

  @ApiProperty({ type: Number })
  size: number;

  @ApiProperty({ type: Number })
  total: number;

  @ApiProperty({ type: Number })
  totalPages: number;

  constructor(items: Session[], page: number, size: number, total: number) {
    this.items = items;
    this.page = page;
    this.size = size;
    this.total = total;
    this.totalPages = size > 0 ? Math.ceil(total / size) : 0;
  }
}

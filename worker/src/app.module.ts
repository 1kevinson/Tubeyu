import { Module } from '@nestjs/common';
import { RedisConnectionService } from './redis-connection.service';

@Module({
  providers: [RedisConnectionService],
})
export class AppModule {}
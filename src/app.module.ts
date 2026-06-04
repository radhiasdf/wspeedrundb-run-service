import { Module } from '@nestjs/common';
import { RunController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [RunController],
  providers: [AppService],
})
export class AppModule {}

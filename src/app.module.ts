import { Module } from '@nestjs/common';
import { RunController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [RunController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
import { Test, TestingModule } from '@nestjs/testing';
import { RunController } from './app.controller';
import { AppService } from './app.service';
import { beforeEach, describe, it } from 'node:test';

describe('RunController', () => {
  let appController: RunController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [RunController],
      providers: [AppService],
    }).compile();

    appController = app.get<RunController>(RunController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
    });
  });
});

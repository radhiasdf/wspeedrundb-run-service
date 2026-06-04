import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS communication for microservices
  app.enableCors(); 
  
  // Enforce validation constraints globally
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  await app.listen(3002); 
}
bootstrap();
import { Module } from '@nestjs/common';
import { OpenAIService } from './services/openai.service';

@Module({
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class AiModule {}

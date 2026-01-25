import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { Env } from '../../env.models';
import OpenAI from 'openai';
@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor(configService: ConfigService<Env>) {
    const apiKey = configService.get('OPENAI_API_KEY', { infer: true });
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async generateSummary(content: string) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates summaries for blog posts.',
        },
        {
          role: 'user',
          content: `Generate a summary for this blog post content: ${content}`,
        },
      ],
    });
    return response.choices[0]?.message?.content || '';
  }

  async generateImage(text: string) {
    const prompt = `Generate an image for a blog post about  ${text}`;
    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt,
      response_format: 'url',
    });
    if (!response.data?.[0]?.url) {
      throw new Error('Failed to generate image');
    }
    return response.data[0].url;
  }
}

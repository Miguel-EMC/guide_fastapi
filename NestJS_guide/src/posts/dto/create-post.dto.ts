import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  @ApiProperty({ description: 'The title of the post ' })
  title: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'The content of the post' })
  content?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @ApiProperty({ description: 'The cover image URL of the post' })
  coverImage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @ApiProperty({ description: 'The summary of the post' })
  summary?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: 'Whether the post is a draft or published' })
  isDraft?: boolean;

  @IsArray()
  @IsOptional()
  @ApiProperty({ description: 'Array of category IDs associated with the post' })
  categoryIds?: number[];
}

import { Type } from 'class-transformer';
import { PartialType, OmitType } from '@nestjs/mapped-types';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateProfileDto, UpdateProfileDto } from './profile.dtos';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({ description: 'The password of the user (minimum 8 characters)' })
  password: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ description: 'The email address of the user' })
  email: string;

  @ValidateNested()
  @Type(() => CreateProfileDto)
  @IsNotEmpty()
  @ApiProperty({ description: 'The profile information of the user' })
  profile: CreateProfileDto;
}

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['profile']),
) {
  @ValidateNested()
  @Type(() => UpdateProfileDto)
  @IsOptional()
  @ApiProperty({ description: 'The updated profile information of the user' })
  profile: UpdateProfileDto;
}

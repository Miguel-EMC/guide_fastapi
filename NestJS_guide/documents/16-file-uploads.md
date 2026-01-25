# File Uploads

NestJS uses Multer for handling file uploads. This guide covers local storage and cloud storage (AWS S3).

## Installation

```bash
# Basic file upload
npm install @nestjs/platform-express
npm install -D @types/multer

# For S3 uploads
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Basic File Upload

### Single File Upload

```typescript
// src/upload/upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
export class UploadController {
  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return {
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
    };
  }
}
```

### Multiple Files Upload

```typescript
// src/upload/upload.controller.ts
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post('files')
  @UseInterceptors(FilesInterceptor('files', 10))  // Max 10 files
  uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return files.map((file) => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
    }));
  }
}
```

### Multiple Fields

```typescript
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post('profile')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'documents', maxCount: 5 },
    ]),
  )
  uploadProfile(
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
  ) {
    return {
      avatar: files.avatar?.[0]?.filename,
      documents: files.documents?.map((f) => f.filename),
    };
  }
}
```

## Custom File Validator

```typescript
// src/common/validators/file.validator.ts
import { FileValidator } from '@nestjs/common';

export class CustomFileValidator extends FileValidator<{ allowedTypes: string[] }> {
  constructor(options: { allowedTypes: string[] }) {
    super(options);
  }

  isValid(file: Express.Multer.File): boolean {
    if (!file) return false;

    const { allowedTypes } = this.validationOptions;
    return allowedTypes.includes(file.mimetype);
  }

  buildErrorMessage(): string {
    return `File type not allowed. Allowed types: ${this.validationOptions.allowedTypes.join(', ')}`;
  }
}

// Usage
@UploadedFile(
  new ParseFilePipe({
    validators: [
      new CustomFileValidator({
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      }),
    ],
  }),
)
file: Express.Multer.File
```

## Upload Service

```typescript
// src/upload/upload.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getFilePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = this.getFilePath(filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  validateFile(
    file: Express.Multer.File,
    options: {
      maxSize?: number;
      allowedMimeTypes?: string[];
    },
  ): void {
    const { maxSize = 5 * 1024 * 1024, allowedMimeTypes } = options;

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Max size: ${maxSize / 1024 / 1024}MB`,
      );
    }

    if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${allowedMimeTypes.join(', ')}`,
      );
    }
  }
}
```

## AWS S3 Upload

### S3 Service

```typescript
// src/upload/s3.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = this.configService.get('AWS_S3_BUCKET');
  }

  async upload(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<{ key: string; url: string }> {
    const key = `${folder}/${uuid()}-${file.originalname}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',  // Or 'private' for signed URLs
      }),
    );

    const url = `https://${this.bucket}.s3.amazonaws.com/${key}`;

    return { key, url };
  }

  async delete(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    folder: string = 'uploads',
  ): Promise<{ key: string; url: string }> {
    const key = `${folder}/${uuid()}-${filename}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    const url = `https://${this.bucket}.s3.amazonaws.com/${key}`;

    return { key, url };
  }
}
```

### S3 Controller

```typescript
// src/upload/upload.controller.ts
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from './s3.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('s3')
  @UseInterceptors(FileInterceptor('file'))  // Memory storage (buffer)
  async uploadToS3(@UploadedFile() file: Express.Multer.File) {
    const result = await this.s3Service.upload(file, 'images');
    return result;
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    const result = await this.s3Service.upload(file, 'avatars');
    return { avatarUrl: result.url };
  }
}
```

## Presigned Upload URLs

For direct client-to-S3 uploads:

```typescript
// src/upload/s3.service.ts
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  async getPresignedUploadUrl(
    filename: string,
    contentType: string,
    folder: string = 'uploads',
  ): Promise<{ uploadUrl: string; key: string }> {
    const key = `${folder}/${uuid()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300,  // 5 minutes
    });

    return { uploadUrl, key };
  }
}

// Controller
@Controller('upload')
export class UploadController {
  @Post('presigned-url')
  async getPresignedUrl(
    @Body() body: { filename: string; contentType: string },
  ) {
    return this.s3Service.getPresignedUploadUrl(
      body.filename,
      body.contentType,
      'user-uploads',
    );
  }
}
```

## Image Processing

```bash
npm install sharp
```

```typescript
// src/upload/image.service.ts
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';

@Injectable()
export class ImageService {
  async resize(
    buffer: Buffer,
    width: number,
    height: number,
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .toBuffer();
  }

  async thumbnail(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(150, 150, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  async optimize(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
  }

  async toWebp(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .webp({ quality: 80 })
      .toBuffer();
  }

  async getMetadata(buffer: Buffer) {
    return sharp(buffer).metadata();
  }
}
```

### Upload with Processing

```typescript
// src/upload/upload.controller.ts
@Controller('upload')
export class UploadController {
  constructor(
    private readonly s3Service: S3Service,
    private readonly imageService: ImageService,
  ) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    // Create thumbnail
    const thumbnailBuffer = await this.imageService.thumbnail(file.buffer);

    // Optimize original
    const optimizedBuffer = await this.imageService.optimize(file.buffer);

    // Upload both to S3
    const [original, thumbnail] = await Promise.all([
      this.s3Service.uploadBuffer(
        optimizedBuffer,
        file.originalname,
        file.mimetype,
        'images',
      ),
      this.s3Service.uploadBuffer(
        thumbnailBuffer,
        `thumb-${file.originalname}`,
        'image/jpeg',
        'thumbnails',
      ),
    ]);

    return {
      original: original.url,
      thumbnail: thumbnail.url,
    };
  }
}
```

## Serve Static Files

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve uploaded files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(3000);
}
```

## Environment Variables

```env
# Local uploads
UPLOAD_DIR=./uploads

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

## File Upload Module

```typescript
// src/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { S3Service } from './s3.service';
import { ImageService } from './image.service';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,  // 10MB
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService, S3Service, ImageService],
  exports: [UploadService, S3Service, ImageService],
})
export class UploadModule {}
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Validate file types | Check mimetype and extension |
| Limit file size | Prevent large uploads |
| Use unique filenames | UUID + original name |
| Store in cloud | S3, GCS for production |
| Process async | Use queues for heavy processing |
| Scan for viruses | Use ClamAV for security |

---

[← Previous: Rate Limiting](./15-rate-limiting.md) | [Back to Index](./README.md) | [Next: WebSockets →](./17-websockets.md)

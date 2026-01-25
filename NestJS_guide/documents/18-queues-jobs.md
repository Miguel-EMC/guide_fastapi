# Queues and Background Jobs

Background job processing is essential for handling time-consuming tasks without blocking the main application. NestJS uses Bull (backed by Redis) for queue management.

## Installation

```bash
npm install @nestjs/bull bull
npm install -D @types/bull

# Redis is required
# docker run -d -p 6379:6379 redis:7-alpine
```

## Basic Setup

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## Creating a Queue

```typescript
// src/email/email.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailProcessor } from './email.processor';
import { EmailService } from './email.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [EmailProcessor, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

## Queue Processor

```typescript
// src/email/email.processor.ts
import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process()  // Default processor
  async handleDefault(job: Job<EmailJobData>) {
    this.logger.log(`Processing email job ${job.id}`);

    const { to, subject, body } = job.data;

    // Simulate sending email
    await this.sendEmail(to, subject, body);

    return { sent: true, to };
  }

  @Process('welcome')  // Named processor
  async handleWelcome(job: Job<{ userId: number; email: string }>) {
    this.logger.log(`Sending welcome email to ${job.data.email}`);

    await this.sendEmail(
      job.data.email,
      'Welcome!',
      'Welcome to our platform!',
    );

    return { sent: true };
  }

  @Process('newsletter')
  async handleNewsletter(job: Job<{ emails: string[]; content: string }>) {
    const { emails, content } = job.data;

    for (let i = 0; i < emails.length; i++) {
      await this.sendEmail(emails[i], 'Newsletter', content);

      // Update progress
      await job.progress(Math.round(((i + 1) / emails.length) * 100));
    }

    return { sent: emails.length };
  }

  private async sendEmail(to: string, subject: string, body: string) {
    // Implement actual email sending
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.logger.log(`Email sent to ${to}: ${subject}`);
  }

  // Event handlers
  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed with result: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}
```

## Adding Jobs to Queue

```typescript
// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {}

  // Add simple job
  async sendEmail(to: string, subject: string, body: string) {
    await this.emailQueue.add({
      to,
      subject,
      body,
    });
  }

  // Add named job
  async sendWelcomeEmail(userId: number, email: string) {
    await this.emailQueue.add('welcome', {
      userId,
      email,
    });
  }

  // Job with options
  async sendEmailWithOptions(to: string, subject: string, body: string) {
    await this.emailQueue.add(
      { to, subject, body },
      {
        delay: 5000,              // Delay 5 seconds
        attempts: 5,              // Retry 5 times
        priority: 1,              // Higher priority (lower number = higher)
        timeout: 30000,           // 30 second timeout
        removeOnComplete: true,   // Remove from queue when done
        removeOnFail: false,      // Keep failed jobs for debugging
      },
    );
  }

  // Scheduled/delayed job
  async scheduleEmail(to: string, subject: string, body: string, sendAt: Date) {
    const delay = sendAt.getTime() - Date.now();

    await this.emailQueue.add(
      { to, subject, body },
      { delay },
    );
  }

  // Bulk add jobs
  async sendBulkEmails(emails: Array<{ to: string; subject: string; body: string }>) {
    const jobs = emails.map((email) => ({
      data: email,
      opts: { attempts: 3 },
    }));

    await this.emailQueue.addBulk(jobs);
  }

  // Newsletter with progress tracking
  async sendNewsletter(emails: string[], content: string) {
    const job = await this.emailQueue.add('newsletter', {
      emails,
      content,
    });

    return job.id;
  }

  // Get job status
  async getJobStatus(jobId: string) {
    const job = await this.emailQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      progress: job.progress(),
      state: await job.getState(),
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }
}
```

## Repeatable Jobs (Cron)

```typescript
// src/tasks/tasks.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class TasksService implements OnModuleInit {
  constructor(
    @InjectQueue('tasks')
    private readonly tasksQueue: Queue,
  ) {}

  async onModuleInit() {
    // Run every day at midnight
    await this.tasksQueue.add(
      'daily-cleanup',
      {},
      {
        repeat: {
          cron: '0 0 * * *',  // Cron syntax
        },
      },
    );

    // Run every 5 minutes
    await this.tasksQueue.add(
      'health-check',
      {},
      {
        repeat: {
          every: 5 * 60 * 1000,  // 5 minutes in ms
        },
      },
    );

    // Run every Monday at 9am
    await this.tasksQueue.add(
      'weekly-report',
      {},
      {
        repeat: {
          cron: '0 9 * * 1',
        },
      },
    );
  }

  // Remove repeatable job
  async removeRepeatable(name: string, cron: string) {
    await this.tasksQueue.removeRepeatable(name, { cron });
  }

  // Get all repeatable jobs
  async getRepeatableJobs() {
    return this.tasksQueue.getRepeatableJobs();
  }
}

// src/tasks/tasks.processor.ts
@Processor('tasks')
export class TasksProcessor {
  @Process('daily-cleanup')
  async handleDailyCleanup() {
    // Clean up old records, temporary files, etc.
  }

  @Process('health-check')
  async handleHealthCheck() {
    // Check external services, send alerts if needed
  }

  @Process('weekly-report')
  async handleWeeklyReport() {
    // Generate and send weekly reports
  }
}
```

## Multiple Queues

```typescript
// src/app.module.ts
@Module({
  imports: [
    BullModule.forRoot({ /* redis config */ }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'notifications' },
      { name: 'image-processing' },
      { name: 'export' },
    ),
  ],
})
export class AppModule {}

// src/export/export.processor.ts
@Processor('export')
export class ExportProcessor {
  @Process()
  async handleExport(job: Job<{ userId: number; format: string }>) {
    const { userId, format } = job.data;

    // Generate export file
    await job.progress(10);

    // Process data
    await job.progress(50);

    // Upload to S3
    await job.progress(90);

    return { fileUrl: 'https://s3.../export.csv' };
  }
}
```

## Job Events and Monitoring

```typescript
// src/common/services/queue-monitor.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueMonitorService implements OnModuleInit {
  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {}

  async onModuleInit() {
    // Listen to queue events
    this.emailQueue.on('global:completed', (jobId, result) => {
      console.log(`Job ${jobId} completed:`, result);
    });

    this.emailQueue.on('global:failed', (jobId, error) => {
      console.error(`Job ${jobId} failed:`, error);
    });

    this.emailQueue.on('global:stalled', (jobId) => {
      console.warn(`Job ${jobId} stalled`);
    });
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async getFailedJobs(limit: number = 10) {
    return this.emailQueue.getFailed(0, limit);
  }

  async retryFailedJob(jobId: string) {
    const job = await this.emailQueue.getJob(jobId);
    if (job) {
      await job.retry();
    }
  }

  async retryAllFailed() {
    const failed = await this.emailQueue.getFailed();
    for (const job of failed) {
      await job.retry();
    }
  }

  async cleanQueue() {
    await this.emailQueue.clean(24 * 3600 * 1000, 'completed'); // Clean completed > 24h
    await this.emailQueue.clean(7 * 24 * 3600 * 1000, 'failed'); // Clean failed > 7d
  }
}
```

## Queue Controller (Admin)

```typescript
// src/admin/queues.controller.ts
import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { QueueMonitorService } from '../common/services/queue-monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/queues')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class QueuesController {
  constructor(private readonly queueMonitor: QueueMonitorService) {}

  @Get('stats')
  async getStats() {
    return this.queueMonitor.getQueueStats();
  }

  @Get('failed')
  async getFailedJobs() {
    return this.queueMonitor.getFailedJobs();
  }

  @Post('retry/:jobId')
  async retryJob(@Param('jobId') jobId: string) {
    await this.queueMonitor.retryFailedJob(jobId);
    return { success: true };
  }

  @Post('retry-all')
  async retryAllFailed() {
    await this.queueMonitor.retryAllFailed();
    return { success: true };
  }

  @Post('clean')
  async cleanQueues() {
    await this.queueMonitor.cleanQueue();
    return { success: true };
  }
}
```

## Use Cases

```typescript
// User registration - send welcome email async
@Injectable()
export class UsersService {
  constructor(
    private readonly emailService: EmailService,
  ) {}

  async register(data: CreateUserDto) {
    const user = await this.userRepository.save(data);

    // Don't wait for email to be sent
    await this.emailService.sendWelcomeEmail(user.id, user.email);

    return user;
  }
}

// Image upload - process async
@Injectable()
export class UploadService {
  constructor(
    @InjectQueue('image-processing')
    private readonly imageQueue: Queue,
  ) {}

  async uploadImage(file: Express.Multer.File) {
    // Save original
    const savedFile = await this.saveFile(file);

    // Queue processing (thumbnails, optimization)
    await this.imageQueue.add({
      fileId: savedFile.id,
      path: savedFile.path,
    });

    return savedFile;
  }
}
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Use Redis persistence | Don't lose jobs on restart |
| Set timeouts | Prevent stuck jobs |
| Implement retries | Handle transient failures |
| Monitor queues | Track failed jobs |
| Clean old jobs | Prevent memory bloat |
| Use separate queues | Isolate different job types |

---

[← Previous: WebSockets](./17-websockets.md) | [Back to Index](./README.md) | [Next: RBAC Permissions →](./19-rbac-permissions.md)

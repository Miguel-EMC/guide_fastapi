import { Module } from '@nestjs/common';
import { Post } from './entities/post.entity';
import { Category } from './entities/category.entity';
import { User } from '../users/entities/user.entity';
import { PostsService } from './services/posts.service';
import { CategoriesService } from './services/categories.service';
import { PostsController } from './controllers/posts.controller';
import { CategoriesController } from './controllers/categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Category, User]), AiModule],
  controllers: [PostsController, CategoriesController],
  providers: [PostsService, CategoriesService],
  exports: [PostsService, CategoriesService],
})
export class PostsModule {}

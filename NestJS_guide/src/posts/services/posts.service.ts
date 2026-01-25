import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { Post } from '../entities/post.entity';
import { User } from '../../users/entities/user.entity';
import { Category } from '../entities/category.entity';
import { OpenAIService } from '../../ai/services/openai.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private openaiService: OpenAIService,
  ) {}

  async findAll(): Promise<Post[]> {
    return await this.postRepository.find({
      relations: ['user', 'user.profile', 'categories'],
    });
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['user', 'user.profile', 'categories'],
    });
    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    return post;
  }

  async create(
    createPostDto: CreatePostDto & { userId: number },
  ): Promise<Post> {
    const { userId, categoryIds, ...postData } = createPostDto;

    // Find the user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Find categories if provided
    let categories: Category[] = [];
    if (categoryIds && categoryIds.length > 0) {
      categories = await this.categoryRepository.find({
        where: { id: In(categoryIds) },
      });
      if (categories.length !== categoryIds.length) {
        throw new NotFoundException('One or more categories not found');
      }
    }

    // Create the post
    const post = this.postRepository.create({
      ...postData,
      user,
      categories,
    });

    return await this.postRepository.save(post);
  }

  async update(id: number, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    Object.assign(post, updatePostDto);
    return await this.postRepository.save(post);
  }

  async remove(id: number): Promise<{ message: string }> {
    const post = await this.findOne(id);
    await this.postRepository.remove(post);
    return { message: 'Post deleted' };
  }

  async getPostsByCategoryId(categoryId: number): Promise<Post[]> {
    const posts = await this.postRepository.find({
      where: { categories: { id: categoryId } },
      relations: ['user', 'user.profile', 'categories'],
    });
    return posts;
  }

  async publish(id: number, userId: number) {
    const post = await this.findOne(id);
    if (post.user.id !== userId) {
      throw new ForbiddenException('You are not allowed to publish this post');
    }
    if (!post.content || !post.title || post.categories.length === 0) {
      throw new BadRequestException(
        'Post content, title and at least one category are required',
      );
    }
    const summary = await this.openaiService.generateSummary(post.content);
    const image = await this.openaiService.generateImage(summary);
    const changes = this.postRepository.merge(post, {
      isDraft: false,
      summary,
      coverImage: image,
    });
    const updatedPost = await this.postRepository.save(changes);
    return this.findOne(updatedPost.id);
  }
}

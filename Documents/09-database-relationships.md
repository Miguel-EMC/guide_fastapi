# Database Relationships

This guide covers One-to-One, One-to-Many, and Many-to-Many relationships in SQLAlchemy with FastAPI.

## Relationship Types

| Type | Example | Description |
|------|---------|-------------|
| One-to-One | User - Profile | Each user has exactly one profile |
| One-to-Many | User - Posts | One user has many posts |
| Many-to-Many | Post - Tags | Posts have many tags, tags have many posts |

## One-to-One Relationship

### Model Definition

```python
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    email: Mapped[str] = mapped_column(String(100), unique=True)

    # One-to-one relationship
    profile: Mapped["Profile"] = relationship(
        back_populates="user",
        uselist=False  # Returns single object, not list
    )


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    bio: Mapped[str | None] = mapped_column(String(500))
    avatar_url: Mapped[str | None] = mapped_column(String(200))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)

    user: Mapped["User"] = relationship(back_populates="profile")
```

### Schemas

```python
from pydantic import BaseModel, ConfigDict
from typing import Optional


class ProfileBase(BaseModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileResponse(ProfileBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class UserWithProfile(BaseModel):
    id: int
    username: str
    email: str
    profile: Optional[ProfileResponse] = None
    model_config = ConfigDict(from_attributes=True)
```

### Usage

```python
from sqlalchemy.orm import selectinload

@app.get("/users/{user_id}", response_model=UserWithProfile)
async def get_user_with_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.profile))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return user
```

## One-to-Many Relationship

### Model Definition

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)

    # One-to-many: one user has many posts
    posts: Mapped[list["Post"]] = relationship(
        back_populates="author",
        cascade="all, delete-orphan"
    )


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    # Many-to-one: many posts belong to one user
    author: Mapped["User"] = relationship(back_populates="posts")
```

### Schemas

```python
class PostBase(BaseModel):
    title: str
    content: str


class PostCreate(PostBase):
    pass


class PostResponse(PostBase):
    id: int
    author_id: int
    model_config = ConfigDict(from_attributes=True)


class UserWithPosts(BaseModel):
    id: int
    username: str
    posts: list[PostResponse] = []
    model_config = ConfigDict(from_attributes=True)
```

### Usage

```python
# Get user with all posts
@app.get("/users/{user_id}/posts", response_model=UserWithPosts)
async def get_user_posts(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.posts))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return user


# Create post for user
@app.post("/users/{user_id}/posts", response_model=PostResponse, status_code=201)
async def create_post(
    user_id: int,
    post: PostCreate,
    db: AsyncSession = Depends(get_db)
):
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "User not found")

    db_post = Post(**post.model_dump(), author_id=user_id)
    db.add(db_post)
    await db.commit()
    await db.refresh(db_post)
    return db_post
```

## Many-to-Many Relationship

### Association Table

```python
from sqlalchemy import Table, Column, ForeignKey

# Association table (no model class needed)
post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", Integer, ForeignKey("posts.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True)
)


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)

    # Many-to-many relationship
    tags: Mapped[list["Tag"]] = relationship(
        secondary=post_tags,
        back_populates="posts"
    )


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)

    posts: Mapped[list["Post"]] = relationship(
        secondary=post_tags,
        back_populates="tags"
    )
```

### Schemas

```python
class TagBase(BaseModel):
    name: str


class TagResponse(TagBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PostWithTags(BaseModel):
    id: int
    title: str
    content: str
    tags: list[TagResponse] = []
    model_config = ConfigDict(from_attributes=True)
```

### Usage

```python
# Get post with tags
@app.get("/posts/{post_id}", response_model=PostWithTags)
async def get_post(post_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id)
        .options(selectinload(Post.tags))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "Post not found")
    return post


# Add tag to post
@app.post("/posts/{post_id}/tags/{tag_id}")
async def add_tag_to_post(
    post_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db)
):
    # Get post with tags
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id)
        .options(selectinload(Post.tags))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "Post not found")

    # Get tag
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(404, "Tag not found")

    # Add tag to post
    if tag not in post.tags:
        post.tags.append(tag)
        await db.commit()

    return {"message": "Tag added"}


# Remove tag from post
@app.delete("/posts/{post_id}/tags/{tag_id}")
async def remove_tag_from_post(
    post_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id)
        .options(selectinload(Post.tags))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "Post not found")

    post.tags = [t for t in post.tags if t.id != tag_id]
    await db.commit()

    return {"message": "Tag removed"}
```

## Association Table with Extra Data

When you need additional fields in the relationship:

```python
class PostTag(Base):
    __tablename__ = "post_tags"

    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), primary_key=True)
    added_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    added_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    post: Mapped["Post"] = relationship(back_populates="post_tags")
    tag: Mapped["Tag"] = relationship(back_populates="post_tags")
    added_by: Mapped["User"] = relationship()


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))

    post_tags: Mapped[list["PostTag"]] = relationship(back_populates="post")
```

## Eager vs Lazy Loading

### Lazy Loading (Default)

```python
# Triggers additional query when accessing relationship
user = await db.get(User, 1)
posts = user.posts  # Additional query here
```

### Eager Loading Options

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `selectinload` | Separate SELECT with IN clause | Lists |
| `joinedload` | JOIN in same query | Single objects |
| `subqueryload` | Subquery for loading | Large datasets |

```python
from sqlalchemy.orm import selectinload, joinedload

# selectinload - best for lists
result = await db.execute(
    select(User).options(selectinload(User.posts))
)

# joinedload - best for single objects
result = await db.execute(
    select(User)
    .where(User.id == user_id)
    .options(joinedload(User.profile))
)
```

## Cascade Options

| Option | Description |
|--------|-------------|
| `all` | All operations cascade |
| `save-update` | Add related objects on save |
| `delete` | Delete related objects |
| `delete-orphan` | Delete orphaned objects |
| `merge` | Merge related objects |

```python
posts: Mapped[list["Post"]] = relationship(
    back_populates="author",
    cascade="all, delete-orphan"  # Delete posts when user is deleted
)
```

## Best Practices

### N+1 Query Problem

```python
# Bad - N+1 queries
users = await db.execute(select(User))
for user in users.scalars():
    print(user.posts)  # Each access is a new query!

# Good - Eager loading
users = await db.execute(
    select(User).options(selectinload(User.posts))
)
for user in users.scalars():
    print(user.posts)  # Already loaded
```

### Circular References in Schemas

```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .post import PostResponse


class UserResponse(BaseModel):
    id: int
    posts: list["PostResponse"] = []

    model_config = ConfigDict(from_attributes=True)


# Update forward references after all models are defined
UserResponse.model_rebuild()
```

## Summary

| Relationship | Foreign Key | Relationship Definition |
|--------------|-------------|------------------------|
| One-to-One | Child table | `uselist=False` |
| One-to-Many | Child table | Default list |
| Many-to-Many | Join table | `secondary=table` |

## Next Steps

- [Authentication](./10-authentication-basics.md) - Protect your API
- [Project Architecture](./13-architecture.md) - Organize large projects

---

[Previous: Database Migrations](./09a-database-migrations.md) | [Back to Index](./README.md) | [Next: Authentication](./10-authentication-basics.md)

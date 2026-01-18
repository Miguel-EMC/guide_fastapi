# Role-Based Access Control (RBAC)

This guide covers user roles, permissions, route protection, and admin functionality in FastAPI.

## What is RBAC?

Role-Based Access Control restricts system access based on user roles.

| Concept | Description |
|---------|-------------|
| **Role** | A named collection of permissions (admin, user, moderator) |
| **Permission** | A specific action allowed (read, write, delete) |
| **Resource** | What the permission applies to (users, posts, settings) |

## Basic Role Implementation

### User Model with Roles

```python
from enum import Enum
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    USER = "user"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(100), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), default=UserRole.USER)
    is_active: Mapped[bool] = mapped_column(default=True)
```

### Schemas

```python
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserResponse(BaseModel):
    id: int
    email: str
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}
```

## Role-Based Dependencies

### Basic Role Check

```python
from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from app.models.user import UserRole


def require_role(required_role: UserRole):
    """Dependency factory for role checking."""
    def role_checker(current_user = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required"
            )
        return current_user
    return role_checker


# Usage
@app.get("/admin/dashboard")
def admin_dashboard(user = Depends(require_role(UserRole.ADMIN))):
    return {"message": "Welcome, Admin!"}
```

### Multiple Roles Allowed

```python
from typing import List


def require_roles(allowed_roles: List[UserRole]):
    """Allow multiple roles to access a route."""
    def role_checker(current_user = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions"
            )
        return current_user
    return role_checker


# Usage: Allow both admin and moderator
@app.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    user = Depends(require_roles([UserRole.ADMIN, UserRole.MODERATOR]))
):
    return {"message": f"Post {post_id} deleted"}
```

### Role Hierarchy

```python
ROLE_HIERARCHY = {
    UserRole.ADMIN: 3,
    UserRole.MODERATOR: 2,
    UserRole.USER: 1,
}


def require_minimum_role(minimum_role: UserRole):
    """User must have at least this role level."""
    def role_checker(current_user = Depends(get_current_user)):
        user_level = ROLE_HIERARCHY.get(current_user.role, 0)
        required_level = ROLE_HIERARCHY.get(minimum_role, 0)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role level"
            )
        return current_user
    return role_checker


# Admin and Moderator can access
@app.get("/reports")
def get_reports(user = Depends(require_minimum_role(UserRole.MODERATOR))):
    return {"reports": []}
```

## Permission-Based Access

For fine-grained control, use permissions instead of just roles.

### Permission Model

```python
from enum import Enum


class Permission(str, Enum):
    # Users
    USER_READ = "user:read"
    USER_CREATE = "user:create"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"

    # Posts
    POST_READ = "post:read"
    POST_CREATE = "post:create"
    POST_UPDATE = "post:update"
    POST_DELETE = "post:delete"

    # Admin
    ADMIN_ACCESS = "admin:access"


# Role to permissions mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [p for p in Permission],  # All permissions
    UserRole.MODERATOR: [
        Permission.USER_READ,
        Permission.POST_READ,
        Permission.POST_CREATE,
        Permission.POST_UPDATE,
        Permission.POST_DELETE,
    ],
    UserRole.USER: [
        Permission.USER_READ,
        Permission.POST_READ,
        Permission.POST_CREATE,
    ],
}
```

### Permission Dependency

```python
def require_permission(permission: Permission):
    """Check if user has specific permission."""
    def permission_checker(current_user = Depends(get_current_user)):
        user_permissions = ROLE_PERMISSIONS.get(current_user.role, [])

        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return current_user
    return permission_checker


# Usage
@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user = Depends(require_permission(Permission.USER_DELETE))
):
    return {"message": f"User {user_id} deleted"}
```

### Multiple Permissions

```python
def require_permissions(permissions: List[Permission], require_all: bool = True):
    """
    Check multiple permissions.
    require_all=True: User needs ALL permissions
    require_all=False: User needs ANY permission
    """
    def permission_checker(current_user = Depends(get_current_user)):
        user_permissions = ROLE_PERMISSIONS.get(current_user.role, [])

        if require_all:
            has_permission = all(p in user_permissions for p in permissions)
        else:
            has_permission = any(p in user_permissions for p in permissions)

        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return permission_checker
```

## Resource Ownership

Check if user owns the resource they're modifying.

```python
from sqlalchemy.ext.asyncio import AsyncSession


async def get_own_post(
    post_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """User can only access their own posts (unless admin)."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(404, "Post not found")

    # Admins can access any post
    if current_user.role == UserRole.ADMIN:
        return post

    # Regular users can only access their own posts
    if post.author_id != current_user.id:
        raise HTTPException(403, "Not authorized to access this post")

    return post


@app.put("/posts/{post_id}")
async def update_post(
    post_id: int,
    post_data: PostUpdate,
    post: Post = Depends(get_own_post),
    db: AsyncSession = Depends(get_db)
):
    # User owns this post or is admin
    for field, value in post_data.model_dump(exclude_unset=True).items():
        setattr(post, field, value)
    await db.commit()
    return post
```

## Complete RBAC Module

### security.py

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user


async def get_current_active_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


class RoleChecker:
    """Reusable role checker class."""

    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return user


# Pre-configured role checkers
allow_admin = RoleChecker([UserRole.ADMIN])
allow_moderator = RoleChecker([UserRole.ADMIN, UserRole.MODERATOR])
allow_authenticated = RoleChecker([UserRole.ADMIN, UserRole.MODERATOR, UserRole.USER])
```

### router.py

```python
from fastapi import APIRouter, Depends
from app.core.security import (
    get_current_user,
    get_current_active_admin,
    allow_admin,
    allow_moderator
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users")
async def list_users(admin = Depends(get_current_active_admin)):
    """Only admins can list all users."""
    return {"users": []}


@router.get("/stats")
async def get_stats(user = Depends(allow_moderator)):
    """Admins and moderators can view stats."""
    return {"stats": {}}


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin = Depends(allow_admin)):
    """Only admins can delete users."""
    return {"message": f"User {user_id} deleted"}
```

## Database-Stored Permissions

For complex applications, store permissions in the database.

```python
# models.py
class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    description: Mapped[str] = mapped_column(String(200))


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role: Mapped[str] = mapped_column(String(20), primary_key=True)
    permission_id: Mapped[int] = mapped_column(
        ForeignKey("permissions.id"),
        primary_key=True
    )
```

## Best Practices

### Security

| Practice | Description |
|----------|-------------|
| Principle of least privilege | Give minimum required permissions |
| Defense in depth | Check permissions at multiple layers |
| Audit logging | Log all permission checks |
| Regular review | Periodically review role assignments |

### Implementation

```python
# Good: Specific permissions
@app.delete("/posts/{id}")
def delete_post(user = Depends(require_permission(Permission.POST_DELETE))):
    ...

# Bad: Too broad
@app.delete("/posts/{id}")
def delete_post(user = Depends(get_current_user)):  # No permission check!
    ...
```

### Testing

```python
def test_admin_can_delete_user(client, admin_token):
    response = client.delete(
        "/admin/users/1",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200


def test_user_cannot_delete_user(client, user_token):
    response = client.delete(
        "/admin/users/1",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 403
```

## Summary

| Pattern | Use Case |
|---------|----------|
| Role check | Simple role-based access |
| Permission check | Fine-grained control |
| Role hierarchy | Inherited permissions |
| Resource ownership | User owns resource |
| Database permissions | Dynamic permission management |

## References

- [FastAPI Security Documentation](https://fastapi.tiangolo.com/tutorial/security/)
- [OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)
- [RBAC Wikipedia](https://en.wikipedia.org/wiki/Role-based_access_control)

## Next Steps

- [Project Architecture](./13-architecture.md) - Advanced patterns
- [Testing](./14-testing.md) - Test your RBAC implementation

---

[Previous: JWT Authentication](./11-jwt-authentication.md) | [Back to Index](./README.md) | [Next: Project Architecture](./13-architecture.md)

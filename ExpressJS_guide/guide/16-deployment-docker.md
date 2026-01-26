# 16 - Deployment with Docker

Deploying a Node.js application can be complex due to managing Node versions, dependencies, and environment variables. **Docker** solves this by packaging your application, its dependencies, and its runtime environment into a portable, isolated **container**. This ensures your application runs the same way everywhere, from your local machine to production servers.

---

## 1. Why Docker for Node.js?

-   **Consistency**: Eliminates "it works on my machine" problems.
-   **Portability**: Runs on any machine or cloud provider that supports Docker.
-   **Isolation**: The application and its dependencies are isolated from the host system.
-   **Scalability**: Container orchestration platforms like Kubernetes make it easy to scale containerized applications.

---

## 2. The `Dockerfile`

A `Dockerfile` is a text file that contains instructions for building a Docker image. We will use a **multi-stage build** to create a small and secure production image.

-   **Builder Stage**: Installs all dependencies (including dev dependencies) and compiles our TypeScript code.
-   **Production Stage**: Starts from a fresh, clean image and copies only the necessary compiled code and production dependencies.

Create a `Dockerfile` in the root of your project:

```dockerfile
# ---- 1. Builder Stage ----
# Use a Node.js base image
FROM node:20-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies, including dev dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Run the TypeScript build command
RUN npm run build

# ---- 2. Production Stage ----
# Use a clean, small Node.js base image
FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json again
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the compiled JavaScript from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 3000

# The command to run the application
CMD ["node", "dist/app.js"]
```

---

## 3. The `.dockerignore` File

To keep your Docker image small and your build context clean, create a `.dockerignore` file in your project root. This works just like a `.gitignore` file.

```
# .dockerignore

# Ignore dependencies, build output, and local environment files
node_modules
dist
.env
npm-debug.log
```

---

## 4. Building and Running the Image

### Build the Image
From your project's root directory, run the `docker build` command:
```bash
docker build -t my-express-api .
```
-   `-t my-express-api`: Tags the image with a name (`my-express-api`).
-   `.`: Specifies the current directory as the build context.

### Run the Container
Run your newly built image:
```bash
docker run \
    -p 3000:3000 \
    -e "NODE_ENV=production" \
    -e "DATABASE_URL=your_production_database_url" \
    -e "JWT_SECRET=your_production_jwt_secret" \
    --name my-api-container \
    my-express-api
```
-   `-p 3000:3000`: Maps port 3000 on your host machine to port 3000 inside the container.
-   `-e`: Passes environment variables to the container. **This is how you provide production configuration.**
-   `--name`: Gives your running container a name.

---

## 5. Using Docker Compose for Local Development

While `docker run` is great, `docker-compose` simplifies managing multi-container applications (like your API and a database) for local development.

Create a `docker-compose.yml` file in your project root:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # API Service
  api:
    build: .
    ports:
      - "3000:3000"
    volumes:
      # Mount your local src directory into the container's src directory
      # This allows for live-reloading during development
      - ./src:/app/src
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/mydb?schema=public
      - JWT_SECRET=my-local-secret
    depends_on:
      - db # Wait for the database to be ready
    # Override the CMD for development to use ts-node for live reload
    # (You may need to add a "dev:watch" script with ts-node-dev or nodemon)
    command: npm run dev

  # Database Service
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Now, you can start your entire development environment with a single command:
```bash
docker-compose up
```
Docker provides a powerful and consistent way to develop, test, and deploy your Express.js application, making it a crucial skill for any modern backend developer.

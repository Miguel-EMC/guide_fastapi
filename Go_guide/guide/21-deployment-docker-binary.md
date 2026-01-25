# 21 - Deployment of Go Applications

One of Go's most significant advantages is its ability to compile your application into a single, statically-linked executable file (a static binary). This binary contains your application code and all its dependencies, with no external requirements other than the target operating system. This simplifies deployment immensely compared to languages that require a runtime and dependency installation on the server.

This guide covers the two most common deployment methods: deploying the raw binary and deploying with Docker.

---

## 1. Deployment Method 1: The Static Binary

This is the most straightforward method. You build the binary on your machine (or a CI/CD server), copy it to your production server, and run it.

### Step 1: Cross-Compilation
Go makes it incredibly easy to compile your application for a different operating system and architecture. For example, you can build a Linux binary from your macOS or Windows machine.

From your project's root directory, run the `go build` command, specifying the target OS and architecture with environment variables:

```bash
# Build for a typical 64-bit Linux server
GOOS=linux GOARCH=amd64 go build -o my-api-server ./cmd/api/
```
-   `GOOS=linux`: Sets the target operating system to Linux.
-   `GOARCH=amd64`: Sets the target architecture to 64-bit x86.
-   `-o my-api-server`: Specifies the output filename for the binary.
-   `./cmd/api/`: The path to your `main` package.

This creates a single executable file named `my-api-server`.

### Step 2: Copy Binary and Assets to Server
Use a tool like `scp` to securely copy the binary and any necessary configuration files to your server.

```bash
# Copy the binary
scp ./my-api-server user@your_server_ip:/home/user/

# Copy your environment configuration file
scp ./.env.production user@your_server_ip:/home/user/.env
```

### Step 3: Running the Application on the Server
Connect to your server via SSH and run the binary. You'll typically want to run it as a background service.

A robust way to do this on modern Linux systems is by creating a **`systemd` service file**.

1.  **Create a service file**:
    ```bash
    sudo nano /etc/systemd/system/my-api.service
    ```
2.  **Add the service configuration**:
    ```ini
    [Unit]
    Description=My Go API Service
    After=network.target

    [Service]
    User=user
    Group=user
    WorkingDirectory=/home/user
    ExecStart=/home/user/my-api-server
    Restart=always
    
    # Load environment variables from the .env file
    EnvironmentFile=/home/user/.env

    [Install]
    WantedBy=multi-user.target
    ```

3.  **Enable and start the service**:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable my-api.service
    sudo systemctl start my-api.service
    
    # Check the status
    sudo systemctl status my-api.service
    ```
Your application is now running as a managed service.

---

## 2. Deployment Method 2: Docker

Docker allows you to package your application and its environment into a portable, isolated container. This is the most popular method for deploying microservices.

### Why Docker?
-   **Consistency**: The application runs in the exact same environment, from local development to production.
-   **Isolation**: The application is isolated from the host system and other applications.
-   **Portability**: Docker containers can run anywhere Docker is installed (on-premises, AWS, Google Cloud, etc.).

### Creating a `Dockerfile` for a Go App
We use a **multi-stage build** to create a minimal and secure final image.

-   **Stage 1 (Builder)**: Uses a full Go build environment to compile the static binary.
-   **Stage 2 (Final)**: Uses a minimal base image (like `scratch` or `alpine`) and copies *only* the compiled binary into it.

Create a `Dockerfile` in your project root:
```dockerfile
# ---- Build Stage ----
# Use the official Go image as a builder
FROM golang:1.22-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy Go module files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the application as a static binary
# CGO_ENABLED=0 is important for creating a static binary
# -ldflags="-w -s" strips debug information to reduce binary size
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /go-api-server ./cmd/api/


# ---- Final Stage ----
# Use a minimal base image
FROM scratch

# Copy only the compiled binary from the builder stage
COPY --from=builder /go-api-server /go-api-server

# (Optional) If you have a config file, copy it too
# COPY --from=builder /app/configs/ /configs/

# Expose the port the application will run on
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["/go-api-server"]
```

### Building and Running the Docker Image

1.  **Build the image**:
    ```bash
    docker build -t my-go-api:latest .
    ```

2.  **Run the container**:
    ```bash
    docker run -p 8080:8080 -e "DB_HOST=your-db-host" -e "DB_USER=user" my-go-api:latest
    ```
    Notice how configuration is passed via environment variables (`-e`).

This containerized application can now be deployed to any container orchestration platform like Kubernetes or a simple cloud server with Docker installed.
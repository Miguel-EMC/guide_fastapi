# 02 - Installation and Setup

Before you can start building powerful backend services with Go, you need to set up your development environment. This guide will walk you through installing Go on Linux, Windows, and macOS, and then creating your first Go program.

---

## 1. Downloading Go

Always download Go from the official website to ensure you get the latest stable release.

-   **Go Downloads**: [https://go.dev/dl/](https://go.dev/dl/)

---

## 2. Installation Steps

### A. Installation on Linux (Ubuntu/Debian Example)

1.  **Download the archive**: Go to the [Go Downloads](https://go.dev/dl/) page and copy the link for the latest Linux version (e.g., `go1.22.1.linux-amd64.tar.gz`).
    ```bash
    wget https://go.dev/dl/go1.22.1.linux-amd64.tar.gz
    ```
2.  **Extract the archive**: Extract the tarball into `/usr/local`. This command will extract it into `/usr/local/go`.
    ```bash
    sudo tar -C /usr/local -xzf go1.22.1.linux-amd64.tar.gz
    ```
3.  **Add Go to your PATH**: Open your shell's profile file (`~/.profile`, `~/.bashrc`, or `~/.zshrc`) and add the following line:
    ```bash
    export PATH=$PATH:/usr/local/go/bin
    ```
4.  **Apply the changes**:
    ```bash
    source ~/.profile # or ~/.bashrc, ~/.zshrc
    ```
5.  **Verify the installation**:
    ```bash
    go version
    # Expected output: go version go1.22.1 linux/amd64
    ```

### B. Installation on Windows

1.  **Download the MSI installer**: Go to the [Go Downloads](https://go.dev/dl/) page and download the `.msi` file for Windows.
2.  **Run the installer**: Double-click the `.msi` file and follow the prompts. The installer will guide you through the process and automatically add Go to your PATH environment variable.
3.  **Verify the installation**: Open a new Command Prompt or PowerShell window and run:
    ```cmd
    go version
    # Expected output: go version go1.22.1 windows/amd64
    ```

### C. Installation on macOS

1.  **Download the PKG installer**: Go to the [Go Downloads](https://go.dev/dl/) page and download the `.pkg` file for macOS.
2.  **Run the installer**: Double-click the `.pkg` file and follow the prompts. The installer will install Go and set up your PATH.
3.  **Alternatively, using Homebrew**: If you have Homebrew, you can install Go with:
    ```bash
    brew install go
    ```
4.  **Verify the installation**: Open a new Terminal window and run:
    ```bash
    go version
    # Expected output: go version go1.22.1 darwin/amd64
    ```

---

## 3. Your First Go Program ("Hello, World!")

Let's create a simple "Hello, World!" program to confirm everything is working. Go projects are organized into modules.

1.  **Create a project directory**:
    ```bash
    mkdir -p ~/go-workspace/hello
    cd ~/go-workspace/hello
    ```
2.  **Initialize a new module**: This command creates a `go.mod` file, which tracks your module's dependencies.
    ```bash
    go mod init example.com/hello
    ```
    *(Replace `example.com/hello` with your desired module path, typically your GitHub username and project name).*

3.  **Create `main.go`**: Inside the `hello` directory, create a file named `main.go` with the following content:
    ```go
    package main

    import "fmt"

    func main() {
        fmt.Println("Hello, Go Backend!")
    }
    ```

4.  **Run the program**:
    ```bash
    go run .
    # Expected output: Hello, Go Backend!
    ```

---

## 4. Recommended IDE/Editor

For Go development, **Visual Studio Code (VS Code)** with the official **Go extension** is highly recommended. It provides excellent features like autocompletion, debugging, code navigation, and formatting.

To install the Go extension in VS Code:
1.  Open VS Code.
2.  Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X).
3.  Search for "Go" and install the one published by the Go Team at Google.
4.  After installation, VS Code will prompt you to install various Go tools (linters, formatters, etc.). Click "Install All".

You are now ready to start coding in Go!
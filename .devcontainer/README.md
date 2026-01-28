# Dev Container

This repository includes a simple VS Code devcontainer configuration.

- Uses the official Microsoft JavaScript/Node devcontainer image (latest).
- Runs `npm install` on container create and on every container start.

Usage:
1. In VS Code, run the command **Remote-Containers: Reopen in Container**.
2. The container will be created and `npm install` will run automatically.

If you prefer a different Node version, edit `.devcontainer/devcontainer.json` and change the image tag as required.
# GitHub Actions Workflows

## deploy-docs.yml

Automatically deploys the project documentation to GitHub Pages using MkDocs Material.

### Trigger

- **Push to main branch**: Automatically deploys when changes are pushed to the main branch
- **Manual trigger**: Can be manually triggered via the Actions tab in GitHub

### What it does

1. Checks out the repository
2. Configures Git credentials for the GitHub Actions bot
3. Sets up Python 3.x
4. Caches MkDocs Material dependencies for faster builds
5. Installs MkDocs Material theme
6. Builds and deploys the documentation to the `gh-pages` branch

### Setup Requirements

Before the workflow can deploy successfully, you need to:

1. **Enable GitHub Pages** in your repository settings:
   - Go to Settings → Pages
   - Set Source to "Deploy from a branch"
   - Select the `gh-pages` branch as the source
   - Click Save

2. **Ensure proper permissions**: The workflow has `contents: write` permission to push to the `gh-pages` branch

### Viewing the Documentation

Once deployed, the documentation will be available at:

```text
https://h-arnold.github.io/JsonDbApp/
```

### Local Testing

To test the documentation site locally before deploying:

```bash
# Install MkDocs Material
pip install mkdocs-material

# Serve the documentation locally
mkdocs serve

# Build the documentation
mkdocs build
```

The site will be available at <http://127.0.0.1:8000/>

### Manual Deployment

To manually deploy the documentation:

```bash
mkdocs gh-deploy --force
```

This builds the site and pushes it to the `gh-pages` branch.

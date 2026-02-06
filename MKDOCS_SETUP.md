# MkDocs Setup for JsonDbApp

This repository uses [MkDocs](https://www.mkdocs.org/) with the [Material theme](https://squidfunk.github.io/mkdocs-material/) to generate and host documentation on GitHub Pages.

## Quick Start

### View the Documentation

The documentation is automatically deployed to GitHub Pages at:

**<https://h-arnold.github.io/JsonDbApp/>**

### Local Development

To work with the documentation locally:

```bash
# Install MkDocs Material
pip install mkdocs-material

# Serve the documentation locally (with live reload)
mkdocs serve
```

Visit <http://127.0.0.1:8000/> to view the local documentation site.

## GitHub Pages Setup

The first time you deploy, you need to enable GitHub Pages:

1. Go to **Settings** → **Pages** in your GitHub repository
2. Under **Source**, select **Deploy from a branch**
3. Select the **gh-pages** branch
4. Click **Save**

After this one-time setup, documentation will be automatically deployed when you push to the `main` branch.

## Automatic Deployment

The GitHub Action workflow (`.github/workflows/deploy-docs.yml`) automatically:

- Builds the documentation using MkDocs Material
- Deploys it to the `gh-pages` branch
- Triggers on every push to `main` branch
- Can also be manually triggered via the Actions tab

## Documentation Structure

The documentation is organized as follows:

```text
docs/
├── index.md                    # Home page (generated from README)
├── Quick_Start.md              # Getting started guide
├── Examples.md                 # Usage examples
├── Querying.md                 # Comprehensive query guide
├── Updates.md                  # Comprehensive update guide
├── developers/                 # Technical documentation
│   ├── README.md
│   ├── Database.md
│   ├── DatabaseConfig.md
│   ├── MasterIndex.md
│   ├── QueryEngine.md
│   ├── UpdateEngine.md
│   ├── Collection_Components.md
│   ├── Infrastructure_Components.md
│   ├── Testing_Framework.md
│   └── Class_Diagrams.md
└── release-notes/              # Release notes
    ├── release-notes-v0.0.4.md
    └── release-notes-v0.0.3.md
```

## MkDocs Configuration

The site is configured via `mkdocs.yml` in the root directory. Key features:

- **Material theme** with light/dark mode toggle
- **Navigation tabs** for major sections
- **Code highlighting** with copy button
- **Search functionality**
- **Responsive design**

## Manual Deployment

To manually deploy the documentation:

```bash
# Build and deploy to gh-pages branch
mkdocs gh-deploy --force
```

## Building Locally

To build the static site without deploying:

```bash
# Build to site/ directory
mkdocs build

# The built site will be in the site/ directory
```

## Troubleshooting

### Documentation not appearing

1. Check that GitHub Pages is enabled in repository settings
2. Verify the `gh-pages` branch exists
3. Check the Actions tab for deployment status
4. Wait a few minutes after deployment (GitHub Pages can take 5-10 minutes to update)

### Build errors

- Ensure all markdown files referenced in `mkdocs.yml` exist in the `docs/` directory
- Check that all internal links use correct relative paths
- Verify Python and pip are installed (`python --version`, `pip --version`)

## Resources

- [MkDocs Documentation](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)


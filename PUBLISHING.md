# Publishing Guide

Complete guide to publishing the .Net Core Dev Tools extension to VS Code Marketplace.

## Prerequisites

### 1. Create Publisher Account

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft account
3. Click "Create publisher"
4. Fill in:
   - **Name**: Your display name (e.g., "Your Name")
   - **ID**: Your publisher ID (e.g., "yourname")
   - **Email**: Your contact email

### 2. Get Personal Access Token (PAT)

1. Go to https://dev.azure.com/
2. Click on your profile → **Security** → **Personal access tokens**
3. Click **+ New Token**
4. Fill in:
   - **Name**: "VSCode Marketplace Publishing"
   - **Organization**: Select your organization
   - **Expiration**: Choose expiration period (e.g., 90 days, 1 year)
   - **Scopes**: Select **Marketplace** → Check **Manage**
5. Click **Create**
6. **Copy the token** immediately (you won't be able to see it again!)

### 3. Update package.json

Update the `publisher` field in `package.json`:

```json
{
  "publisher": "your-publisher-id",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/netcore-dev-tools"
  }
}
```

## Installation

Install dependencies including vsce:

```bash
npm install
```

## Publishing Process

### Option 1: Automated Publishing with Version Bump

```bash
# Patch release (0.0.1 → 0.0.2)
npm run publish:patch

# Minor release (0.0.1 → 0.1.0)
npm run publish:minor

# Major release (0.0.1 → 1.0.0)
npm run publish:major
```

These commands will:
1. Bump the version in `package.json`
2. Run lint checks
3. Create .vsix package
4. Publish to marketplace

### Option 2: Manual Publishing

```bash
# 1. Update version in package.json manually

# 2. Create package
npm run package

# 3. Test the .vsix file locally
code --install-extension netcore-dev-tools-0.0.1.vsix

# 4. Publish when ready
npm run publish
```

### Option 3: Package Only (No Publish)

```bash
# Create .vsix file for local testing or manual upload
npm run package
```

This creates a `netcore-dev-tools-X.Y.Z.vsix` file that you can:
- Test locally: `code --install-extension netcore-dev-tools-X.Y.Z.vsix`
- Upload manually at https://marketplace.visualstudio.com/manage
- Share with others for testing

## First Time Setup

### Login to vsce

```bash
npx vsce login your-publisher-id
```

Enter your Personal Access Token when prompted.

## Before Publishing Checklist

- [ ] Update `CHANGELOG.md` with new changes
- [ ] Test extension thoroughly (F5 in VS Code)
- [ ] Update README.md if needed
- [ ] Run `npm run lint` to check for errors
- [ ] Update version number appropriately (semver)
- [ ] Ensure `publisher` field is correct in package.json
- [ ] Verify `.vscodeignore` excludes unnecessary files
- [ ] Check that `assets/` folder is included (netcoredbg binaries)

## After Publishing

1. **Verify on Marketplace**:
   - Go to https://marketplace.visualstudio.com/items?itemName=your-publisher-id.netcore-dev-tools
   - Check that all information is correct
   - Test installation: `ext install your-publisher-id.netcore-dev-tools`

2. **Tag the Release** (optional but recommended):
   ```bash
   git tag v0.0.1
   git push origin v0.0.1
   ```

3. **Create GitHub Release** (if using GitHub):
   - Go to your repository releases
   - Create new release with tag
   - Upload the .vsix file as an asset
   - Copy changelog content to release notes

## Troubleshooting

### "401 Unauthorized" Error

- Your PAT may have expired
- Create a new PAT and login again: `npx vsce login your-publisher-id`

### "Missing repository" Warning

Add repository field to `package.json`:
```json
"repository": {
  "type": "git",
  "url": "https://github.com/username/repo"
}
```

### "Missing icon" Warning

Add icon to package.json:
```json
"icon": "icon.png"
```
Place a 128x128 PNG icon in the root directory.

### Package Size Too Large

Check what's being included:
```bash
npx vsce ls
```

Update `.vscodeignore` to exclude unnecessary files.

## Useful Commands

```bash
# List all files that will be packaged
npx vsce ls

# Show package info
npx vsce show netcore-dev-tools

# Unpublish a version (use with caution!)
npx vsce unpublish your-publisher-id.netcore-dev-tools@0.0.1

# Update existing version (patch/minor/major)
npx vsce publish patch
npx vsce publish minor
npx vsce publish major
```

## Resources

- [VS Code Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce CLI Documentation](https://github.com/microsoft/vscode-vsce)
- [Marketplace Management Portal](https://marketplace.visualstudio.com/manage)
- [Azure DevOps PAT](https://dev.azure.com/)


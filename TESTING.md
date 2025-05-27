# 🧪 Testing Guide for Maven SSO Package Development

This guide covers testing during **package development**. For end-user testing, see the generated README after running the scaffold command.

## 🚀 Quick Package Testing

```bash
# 1. Build the package
npm run build

# 2. Run unit tests
npm run test:netlify

# 3. Test with Netlify dev (optional)
npm run dev:netlify
```

## 📋 Testing Methods

### 1. **Unit Tests** (Primary for Package Development)
Tests the handler functions directly without HTTP layer.

```bash
npm run test:netlify
```

**What it tests:**
- ✅ CORS headers
- ✅ HTTP method validation  
- ✅ Input validation
- ✅ Error handling
- ✅ Origin validation
- ✅ Cookie handling

### 2. **Integration Testing** (For Package Validation)
Test the actual handlers in a Netlify environment:

```bash
# Terminal 1: Start dev server
npm run dev:netlify

# Terminal 2: Run integration tests  
npm run test:curl
```

## 🎯 Expected Test Results

### ✅ Unit Test Results
All tests should pass:
```
🚀 Starting Maven SSO Netlify Functions Tests

🧪 Testing CORS (OPTIONS requests)...
✅ Login CORS: PASS
✅ Logout CORS: PASS
✅ CheckAuth CORS: PASS

🧪 Testing HTTP method validation...
✅ Login rejects GET: PASS
✅ Logout rejects POST: PASS
✅ CheckAuth rejects POST: PASS

🧪 Testing login validation...
✅ Login rejects missing code: PASS
✅ Login accepts code: PASS

🧪 Testing check auth without token...
✅ CheckAuth without token: PASS

🧪 Testing logout...
✅ Logout success: PASS
✅ Logout clears cookie: PASS

🧪 Testing origin validation...
✅ Rejects bad origin: PASS
✅ Accepts good origin: PASS

✨ Tests completed!
```

## 🔧 Package Development Workflow

1. **Make changes to handlers** in `src/netlify/createHandlers.ts`
2. **Build the package:** `npm run build`
3. **Run unit tests:** `npm run test:netlify`
4. **Test integration** (if needed): `npm run dev:netlify`

## 🚀 Testing the CLI Scaffold

Test that the scaffold command works correctly:

```bash
# Build the package
npm run build

# Test in a temporary directory
mkdir /tmp/test-scaffold
cd /tmp/test-scaffold

# Run the scaffold command
npx /path/to/your/package scaffold

# Verify files were created
ls -la
# Should see: netlify/, .env.example, netlify.toml, README.md
```

## 📦 Package Publishing Checklist

Before publishing to npm:

- [ ] All unit tests pass (`npm run test:netlify`)
- [ ] Package builds successfully (`npm run build`)
- [ ] CLI scaffold works (`test in temp directory`)
- [ ] TypeScript types are generated (`dist/` contains .d.ts files)
- [ ] Environment examples are comprehensive
- [ ] Documentation is up to date

## 🆘 Common Development Issues

### Build Errors
```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

### Test Failures
- Check if handlers are properly exported
- Verify mock event structure matches Netlify format
- Ensure CORS configuration is correct

### CLI Issues
- Make sure `dist/cli/scaffold.js` is executable
- Check that all template files are included
- Verify file paths in scaffold script

---

*Keep it simple for package development!* 🎯 The heavy testing is for end-users of your package. 
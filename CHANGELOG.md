# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- TypeScript configuration
- React SSO Provider component
- Authentication hooks and utilities
- Netlify Functions helpers
- Comprehensive documentation

## [1.0.0] - 2024-01-XX

### Added
- 🎉 Initial release of Maven Marketing SSO package
- 🔐 Teamwork OAuth integration
- ⚛️ React Provider pattern for auth state management
- 🌐 Netlify Functions support for serverless backend
- 🔒 Full TypeScript support with type definitions
- 🎯 Role-based access control
- 🔄 Automatic token refresh functionality
- 📱 Ready-to-use authentication components
- 🛡️ Secure token storage with fallback mechanisms
- 📚 Comprehensive documentation and examples

### Components
- `SSOProvider` - Main authentication provider
- `LoginButton` - Customizable login button
- `LogoutButton` - Logout functionality
- `ProtectedRoute` - Route protection with role/permission checks

### Hooks
- `useAuth` - Main authentication hook
- `useSSOContext` - Direct context access

### Utilities
- `createSSOClient` - SSO client factory
- `createAuthHandler` - Netlify auth handler
- `createCallbackHandler` - OAuth callback handler
- `createTokenRefreshHandler` - Token refresh handler

### Security Features
- Secure cookie storage with localStorage fallback
- CORS handling for Netlify Functions
- Token expiration management
- Automatic token refresh

[Unreleased]: https://github.com/your-username/mavenmm-tw-netlify-react-sso/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-username/mavenmm-tw-netlify-react-sso/releases/tag/v1.0.0 
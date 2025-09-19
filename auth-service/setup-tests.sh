#!/bin/bash

# Install test dependencies
npm install --save-dev \
  jest \
  ts-jest \
  @types/jest \
  @jest/globals \
  @types/node \
  typescript

# Create tsconfig for tests
cat > tsconfig.test.json << EOL
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["jest", "node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": [
    "functions/**/*.ts",
    "functions/**/*.test.ts",
    "src/**/*.ts"
  ]
}
EOL

# Make the script executable
chmod +x setup-tests.sh

echo "✨ Test environment setup complete! Run 'npm test' to start testing." 
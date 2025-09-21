# Code Quality Check Scripts

## Available Commands

### `npm run check`
- **Purpose**: Main command that runs both TypeScript type checking and ESLint
- **What it does**: 
  1. Runs `tsc --noEmit` to check TypeScript types without generating files
  2. Runs ESLint to check code quality and style
- **Exit code**: Returns 0 if all checks pass, 1 if there are issues

### `npm run typecheck`
- **Purpose**: Check TypeScript types only
- **What it does**: Validates all TypeScript files for type errors, missing imports, and type mismatches
- **Use case**: Quick type checking during development

### `npm run lint`
- **Purpose**: Run ESLint only
- **What it does**: Checks code quality, style, and potential issues
- **Use case**: Quick linting during development

### `npm run lint:fix`
- **Purpose**: Run ESLint with auto-fix
- **What it does**: Automatically fixes fixable ESLint issues
- **Use case**: Clean up code automatically

### `npm run check:fix`
- **Purpose**: Run type checking and linting with auto-fix
- **What it does**: Type check + auto-fix ESLint issues
- **Use case**: Comprehensive code cleanup

### `npm run build:check`
- **Purpose**: Check everything before building
- **What it does**: Runs checks first, then builds the project
- **Use case**: Ensure clean builds

### `npm run precommit`
- **Purpose**: Pre-commit checks
- **What it does**: Same as `npm run check`
- **Use case**: Git pre-commit hooks

### `npm run ci`
- **Purpose**: CI/CD pipeline checks
- **What it does**: Same as `npm run check`
- **Use case**: Continuous integration pipelines

## Configuration

- **ESLint**: Configured in `eslint.config.mjs` with Next.js and TypeScript rules
- **TypeScript**: Configured in `tsconfig.json`
- **Ignored files**: `.next/`, `node_modules/`, build directories, and generated files
- **Rules**: Balanced between code quality and development productivity

## Best Practices

1. Run `npm run check` before committing code
2. Use `npm run check:fix` to automatically fix common issues
3. Use `npm run build:check` before deploying
4. Set up pre-commit hooks using `npm run precommit`

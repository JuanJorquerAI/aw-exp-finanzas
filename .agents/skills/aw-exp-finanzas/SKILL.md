```markdown
# aw-exp-finanzas Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you the core development patterns, coding conventions, and workflows used in the `aw-exp-finanzas` TypeScript monorepo. The repository contains a backend API (NestJS), a frontend web app (Next.js), and shared packages for types and validation. You'll learn how to add features, maintain code quality, and follow established conventions for scalable, maintainable code.

---

## Coding Conventions

### File Naming

- Use **camelCase** for file names.
  - Example: `userController.ts`, `financeService.ts`

### Imports

- Use **relative imports** for modules within the same package.
  - Example:
    ```typescript
    import { calculateInterest } from './utils';
    ```

### Exports

- Prefer **named exports** over default exports.
  - Example:
    ```typescript
    // Good
    export function calculateInterest() { ... }

    // Avoid
    // export default function calculateInterest() { ... }
    ```

### Commit Messages

- Use **Conventional Commits** with these prefixes:
  - `feat`: New features
  - `fix`: Bug fixes
  - `chore`: Maintenance
  - `docs`: Documentation
- Keep commit messages concise (average ~61 characters).

---

## Workflows

### Add or Update API Endpoint

**Trigger:** When you need to add a new resource or update logic for an existing resource in the API.  
**Command:** `/new-api-endpoint`

1. **Controller:** Create or update the controller file in  
   `apps/api/src/<resource>/<resource>.controller.ts`
2. **Service:** Create or update the service file in  
   `apps/api/src/<resource>/<resource>.service.ts`
3. **DTOs:** Create or update DTO files in  
   `apps/api/src/<resource>/dto/`
4. **Module:** Update the module file if needed in  
   `apps/api/src/<resource>/<resource>.module.ts`
5. **Tests:** Write or update unit tests in  
   `apps/api/src/<resource>/<resource>.service.spec.ts`

**Example:**
```typescript
// apps/api/src/user/user.controller.ts
import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }
}
```

---

### Feature Development: Web Component

**Trigger:** When you want to add a new user-facing feature or page to the web app.  
**Command:** `/new-web-feature`

1. **Page:** Create or update a page file in  
   `apps/web/app/(app)/<feature>/page.tsx`
2. **Component:** Create or update a component in  
   `apps/web/components/<feature>/*.tsx`
3. **Hooks/Utils:** Create or update supporting hooks or utility files in  
   `apps/web/hooks/` or `apps/web/lib/`
4. **Navigation:** Update layout or sidebar if navigation changes

**Example:**
```tsx
// apps/web/components/user/UserProfile.tsx
export function UserProfile({ user }) {
  return <div>{user.name}</div>;
}
```

---

### Feature Development with Tests

**Trigger:** When you want to ensure new features are covered by tests.  
**Command:** `/new-feature-with-tests`

1. **Implement Feature:** Add or update feature logic (API or web)
2. **Write Tests:** Add or update unit tests (NestJS) or E2E tests (Playwright)
3. **Refine:** Fix or adjust code based on test results

**Example:**
```typescript
// apps/api/src/user/user.service.spec.ts
import { UserService } from './user.service';

describe('UserService', () => {
  it('should return all users', () => {
    const service = new UserService();
    expect(service.findAll()).toEqual([]);
  });
});
```

---

### Add Shared Schema or Type

**Trigger:** When you want to add or update data validation or type definitions shared between backend and frontend.  
**Command:** `/new-shared-schema`

1. **Schema:** Create or update schema file in  
   `packages/shared/src/schemas/`
2. **Export:** Update `packages/shared/src/index.ts` to export the new schema
3. **Tests:** Add or update tests in  
   `packages/shared/src/__tests__/`

**Example:**
```typescript
// packages/shared/src/schemas/userSchema.ts
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});
```

---

## Testing Patterns

- **Unit tests** use [Jest](https://jestjs.io/).
- Test files are named with `.spec.ts` suffix.
  - Example: `user.service.spec.ts`
- Place tests alongside the code they test (e.g., in the same directory).

**Example:**
```typescript
// apps/api/src/finance/finance.service.spec.ts
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  it('should calculate total', () => {
    const service = new FinanceService();
    expect(service.calculateTotal([1, 2, 3])).toBe(6);
  });
});
```

---

## Commands

| Command                | Purpose                                                    |
|------------------------|------------------------------------------------------------|
| /new-api-endpoint      | Add or update an API endpoint in the backend               |
| /new-web-feature       | Add a new feature or UI component to the frontend          |
| /new-feature-with-tests| Implement a feature and add corresponding automated tests  |
| /new-shared-schema     | Add or update shared validation schemas or types           |
```

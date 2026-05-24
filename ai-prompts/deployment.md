# HexaTrack AI Prompt Pack: Production Deployment & DevOps

Use this prompt to guide the AI in validating environment variables, debugging build-time compilation issues, and setting up dockerized configurations or PWA assets.

## Prompt Template

```markdown
Act as a DevOps Engineer, System Administrator, and Release Specialist.
Audit and prepare HexaTrack frontend and backend configurations for secure production deployment.

### 1. Environment Variable Auditing & Leak Prevention
Verify all configuration files (`.env.production`, `.env.backend`) for safety and correctness:
- **Frontend variables**: All variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Ensure they contain no database passwords, JWT signing keys, or server secrets.
- **Backend variables**: Confirm variables like `ConnectionStrings:DefaultConnection`, `JwtSettings:Secret`, `Redis:ConnectionString`, and external service keys are present.
- **Default Fallbacks**: Avoid hardcoded production keys. Provide development fallbacks but explicitly block production builds if critical variables are missing.

### 2. Next.js 15 Build & Lint Optimizations
Before deploying, execute checking mechanisms to prevent runtime crashes:
- **TypeScript Type Verification**: Verify that the Next.js frontend builds without errors by running type checking:
  `npx tsc --noEmit`
- **Lint Verification**: Execute lint checking (`npm run lint`) to intercept unused variables, un-escaped HTML quotes, or deprecated lifecycle warnings.
- **Dynamic Pre-rendering**: Ensure routes that read query parameters or cookies are marked dynamic (`export const dynamic = 'force-dynamic'`) to prevent Next.js from failing at build time due to static optimization issues.

### 3. Progressive Web App (PWA) Assets & SW Integrity
HexaTrack operates as a premium mobile-first platform and requires robust PWA functionality:
- **Webmanifest Audits**: Verify the existence and structure of `public/manifest.json`. Check that orientation is set to `portrait`, background_color is `#F9FAFB`, theme_color is `#10B981`, and display is set to `standalone`.
- **Service Worker Hooks**: Ensure the service worker caches critical assets (HTML, CSS, JS, favicons) and provides an offline fallback screen when the backend API is unreachable.
- **PWA Icons**: Check that a complete set of high-resolution icons (192x192, 512x512) exists in `public/` and are correctly referenced.

### 4. Backend (C# API) & Docker Validation
- **Dockerfile Integrity**: Verify that the backend Docker container builds using multi-stage builds (SDK stage for compiling, Runtime stage for hosting to keep image sizes small).
- **Background Tasks (Hangfire)**: Check that the Hangfire dashboard routes are protected with appropriate authentication rules (only accessible by `SuperAdmin` users).
- **Redis Cache & Session Validation**: Ensure that Redis connection failover logic is established so that the API remains responsive if Redis goes offline momentarily.
- **Database Migrations**: Database migrations should run automatically during startup in the docker container or during pipeline deployment. Ensure migration scripts contain transactional wrappers so a failing migration doesn't leave the database in an inconsistent state.
```

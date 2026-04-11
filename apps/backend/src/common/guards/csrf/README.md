# CSRF Guard Module

Provides CSRF (Cross-Site Request Forgery) protection for the AiNeed backend API.

## Quick Start

### 1. Set Environment Variable

Add to your `.env` file:

```env
CSRF_SECRET=your-strong-random-secret-key-here
```

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Import and Use

```typescript
import { CsrfGuard } from '@/common/guards/csrf';
import { ExcludeCsrf } from '@/common/guards/csrf';

@Controller('api/v1/users')
@UseGuards(CsrfGuard)
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    // Requires CSRF token
  }

  @Get()
  findAll() {
    // Automatically generates and exposes CSRF token
  }

  @Post('webhook')
  @ExcludeCsrf()
  handleWebhook() {
    // Excluded from CSRF protection
  }
}
```

### 3. Frontend Integration

```typescript
// Get CSRF token
const response = await fetch('http://localhost:3001/api/csrf/token', {
  method: 'GET',
  credentials: 'include',
});
const csrfToken = response.headers.get('X-CSRF-Token');

// Use token in POST request
await fetch('http://localhost:3001/api/v1/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  credentials: 'include',
  body: JSON.stringify(data),
});
```

## Documentation

For detailed documentation, see: `/docs/CSRF.md`

For usage examples, see: `example-usage.ts`

## Features

- **Automatic token generation** on GET requests
- **Token validation** on state-changing requests (POST, PUT, DELETE, PATCH)
- **Session binding** tokens are tied to user sessions
- **Token expiration** tokens expire after 24 hours
- **Flexible exclusion** use `@ExcludeCsrf()` decorator for public endpoints
- **Cookie and header support** tokens available via cookie and HTTP header

## Security

- SHA-256 hashing with secret key
- Cryptographically secure random values
- 24-hour token expiration
- Session-based token binding
- Production environment validation

## Components

- `CsrfService` - Token generation and validation
- `CsrfGuard` - Route protection
- `CsrfController` - Token endpoint
- `ExcludeCsrf` - Exclusion decorator

## Testing

```bash
# Get CSRF token
curl -v http://localhost:3001/api/csrf/token

# Use token in POST request
curl -X POST http://localhost:3001/api/v1/users \
  -H "X-CSRF-Token: your-token-here" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'
```

## Troubleshooting

See `/docs/CSRF.md` for detailed troubleshooting guide.

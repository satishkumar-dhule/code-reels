# Development Guide

This guide provides detailed information for developers working on Learn_Reels.

## Project Overview

Learn_Reels is a full-stack web application built with:
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Backend**: Express.js, Node.js
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Automation**: GitHub Actions, OpenCode AI

## Architecture

### Directory Structure

```
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities and data
│   │   ├── context/          # React context
│   │   └── App.tsx
│   └── index.html
├── server/                    # Express backend
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # API routes
│   ├── static.ts             # Static file serving
│   └── vite.ts               # Vite dev server
├── script/                    # Automation scripts
│   ├── generate-question.js  # Daily question generator
│   ├── improve-question.js   # Question improvement bot
│   └── migrate-add-timestamp.js
├── shared/                    # Shared types
└── .github/workflows/         # GitHub Actions
```

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm 8+
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/satishkumar-dhule/reel-interview-code.git
cd reel-interview-code

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env.local
```

### Environment Variables

Create `.env.local`:
```env
# Server
NODE_ENV=development
PORT=5000

# Database (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/learn_reels

# API Keys (if needed)
OPENCODE_API_KEY=your_key_here
```

## Running the Application

### Development Mode

```bash
# Run both client and server
pnpm run dev

# Or run separately
pnpm run dev:client  # Port 5000
pnpm run dev         # Server on port 5000
```

### Production Build

```bash
# Build
pnpm run build

# Start
pnpm run start

# Preview
pnpm run preview
```

## Code Quality

### Type Checking

```bash
pnpm run check
```

### Linting

```bash
# ESLint (if configured)
pnpm run lint

# Format code
pnpm run format
```

## Working with Questions

### Question Data Structure

Questions are stored in `client/src/lib/questions/` as JSON files:

```json
{
  "id": "ch-1",
  "question": "Your question?",
  "answer": "Concise answer",
  "explanation": "Detailed explanation",
  "tags": ["tag1", "tag2"],
  "difficulty": "beginner|intermediate|advanced",
  "channel": "channel-name",
  "subChannel": "sub-channel-name",
  "diagram": "mermaid diagram",
  "lastUpdated": "2025-12-12T09:07:04.186Z"
}
```

### Adding Questions Manually

1. Edit the appropriate JSON file in `client/src/lib/questions/`
2. Add a new question object
3. Ensure unique ID
4. Include all required fields
5. Test locally

### Generating Questions Automatically

```bash
# Generate 5 questions
node script/generate-question.js

# Improve 5 questions
node script/improve-question.js

# Migrate timestamps
node script/migrate-add-timestamp.js
```

## Frontend Development

### Component Structure

```typescript
// Functional component with hooks
import { useState, useEffect } from 'react';

export default function MyComponent() {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Side effects
  }, []);

  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

### Styling

- Use Tailwind CSS classes
- Follow existing design patterns
- Ensure responsive design
- Test on mobile devices

### State Management

- Use React hooks (useState, useContext)
- Use React Query for server state
- Use localStorage for client state

## Backend Development

### API Routes

Routes are defined in `server/routes.ts`:

```typescript
app.get('/api/questions', (req, res) => {
  // Handle request
});
```

### Middleware

- Express middleware for logging
- Error handling middleware
- CORS middleware (if needed)

## Testing

### Manual Testing

1. Test on desktop and mobile
2. Test keyboard navigation
3. Test all user flows
4. Check console for errors

### Automated Testing

```bash
# Run tests (if configured)
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage
pnpm run test:coverage
```

## Git Workflow

### Branch Naming

```
feature/description
fix/description
docs/description
refactor/description
```

### Commit Messages

```
type(scope): description

Examples:
feat(questions): add system design questions
fix(ui): improve mobile navigation
docs(readme): update installation
```

### Pull Request Process

1. Create feature branch
2. Make changes
3. Commit with clear messages
4. Push to fork
5. Create pull request
6. Address review feedback
7. Merge when approved

## Debugging

### Browser DevTools

- Use React DevTools extension
- Use Network tab for API calls
- Use Console for errors

### Server Debugging

```bash
# Run with debugging
node --inspect script/generate-question.js

# Or use VS Code debugger
```

### Logging

```typescript
console.log('Debug message:', variable);
console.error('Error:', error);
console.warn('Warning:', message);
```

## Performance Optimization

### Frontend

- Code splitting with dynamic imports
- Image optimization
- Lazy loading components
- Memoization with React.memo

### Backend

- Database query optimization
- Caching strategies
- Response compression
- Connection pooling

## Deployment

### GitHub Pages

```bash
pnpm run deploy:pages
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm run build
CMD ["pnpm", "start"]
```

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

**Dependencies not installing**
```bash
# Clear cache and reinstall
pnpm store prune
pnpm install
```

**Build errors**
```bash
# Clean build
rm -rf dist node_modules
pnpm install
pnpm run build
```

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com)
- [Express.js Guide](https://expressjs.com)
- [Vite Documentation](https://vitejs.dev)

## Getting Help

- Check existing issues and discussions
- Read the CONTRIBUTING.md guide
- Ask in GitHub Discussions
- Contact maintainers

## Code Review Checklist

Before submitting a PR, ensure:

- [ ] Code follows style guidelines
- [ ] No console errors or warnings
- [ ] Tests pass (if applicable)
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No hardcoded secrets
- [ ] Responsive design tested
- [ ] Keyboard navigation works
- [ ] Performance acceptable
- [ ] Accessibility considered

## Additional Notes

- Keep components small and focused
- Write self-documenting code
- Add comments for complex logic
- Test edge cases
- Consider performance implications
- Follow existing patterns
- Ask for help when needed

Happy coding! 🚀

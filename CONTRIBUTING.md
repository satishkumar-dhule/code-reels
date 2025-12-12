# Contributing to Learn_Reels

Thank you for your interest in contributing to Learn_Reels! We welcome contributions from everyone. This document provides guidelines and instructions for contributing.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

## Ways to Contribute

### 1. Add or Improve Questions
- **Add new questions** - Submit questions for any of our channels
- **Improve existing questions** - Enhance explanations, add diagrams, fix issues
- **Review questions** - Help identify questions that need improvement

### 2. Report Issues
- Found a bug? [Open an issue](https://github.com/satishkumar-dhule/reel-interview-code/issues/new)
- Have a suggestion? [Start a discussion](https://github.com/satishkumar-dhule/reel-interview-code/discussions)

### 3. Code Contributions
- Fix bugs
- Add new features
- Improve performance
- Enhance UI/UX
- Write tests

### 4. Documentation
- Improve README
- Add tutorials
- Create guides
- Fix typos

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- Git

### Setup Development Environment

```bash
# Fork the repository
git clone https://github.com/YOUR_USERNAME/reel-interview-code.git
cd reel-interview-code

# Install dependencies
pnpm install

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Development Workflow

```bash
# Start development server
pnpm run dev

# Type checking
pnpm run check

# Build for production
pnpm run build
```

## Adding Questions

### Manual Addition

1. **Locate the channel file** in `client/src/lib/questions/`
   - `system-design.json`
   - `algorithms.json`
   - `frontend.json`
   - `database.json`
   - `devops.json`
   - `sre.json`

2. **Add a new question object:**
```json
{
  "id": "ch-XXX",
  "question": "Your question here?",
  "answer": "Concise answer (50-150 chars)",
  "explanation": "Detailed markdown explanation with **bold** and bullet points",
  "tags": ["tag1", "tag2"],
  "difficulty": "beginner|intermediate|advanced",
  "channel": "channel-name",
  "subChannel": "sub-channel-name",
  "diagram": "graph TD\n    A[Node] --> B[Node]",
  "lastUpdated": "2025-12-12T09:07:04.186Z"
}
```

3. **Guidelines:**
   - Use unique IDs (e.g., `sy-1`, `al-2`, `fe-3`)
   - Keep answers concise (50-150 characters)
   - Provide comprehensive explanations with markdown formatting
   - Include mermaid diagrams where applicable
   - Add relevant tags
   - Set difficulty level appropriately

### Automated Generation

Questions can be automatically generated using OpenCode:

```bash
# Generate 5 questions
node script/generate-question.js

# Improve 5 questions
node script/improve-question.js
```

## Code Style

### TypeScript
- Use TypeScript for all new code
- Follow existing naming conventions
- Add type annotations
- Keep functions focused and reusable

### React Components
- Use functional components with hooks
- Keep components small and focused
- Use descriptive names
- Add comments for complex logic

### Styling
- Use Tailwind CSS classes
- Follow existing design patterns
- Ensure responsive design
- Test on mobile devices

## Commit Guidelines

```bash
# Format: type(scope): description

# Examples:
git commit -m "feat(questions): add system design questions"
git commit -m "fix(ui): improve mobile navigation"
git commit -m "docs(readme): update installation steps"
git commit -m "refactor(hooks): simplify progress tracking"
```

### Commit Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Build, dependencies, etc.

## Pull Request Process

### Before Submitting

1. **Update your branch**
   ```bash
   git pull origin main
   git rebase main
   ```

2. **Run checks**
   ```bash
   pnpm run check
   ```

3. **Test your changes**
   - Test on desktop and mobile
   - Verify keyboard navigation
   - Check for console errors

4. **Update documentation** if needed

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Question addition/improvement
- [ ] Documentation update
- [ ] Performance improvement

## Related Issues
Closes #(issue number)

## Testing
How to test these changes:
1. Step 1
2. Step 2

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass (if applicable)
```

### Review Process

1. Maintainers will review your PR
2. Address feedback and suggestions
3. Make requested changes
4. Once approved, your PR will be merged

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Your environment (OS, browser, Node version)

### Feature Requests

Include:
- Clear description of the feature
- Use cases and benefits
- Possible implementation approach
- Any related issues or discussions

## Questions?

- **GitHub Discussions** - Ask questions and share ideas
- **GitHub Issues** - Report bugs or request features
- **Email** - Contact maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- README.md contributors section
- GitHub contributors page
- Release notes

Thank you for contributing to Learn_Reels! 🚀

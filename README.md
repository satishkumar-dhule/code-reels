# Learn_Reels - Technical Interview Preparation Platform

> A modern, interactive platform for mastering technical interview questions across multiple domains. Built with React, TypeScript, and Node.js.

[![GitHub Stars](https://img.shields.io/github/stars/satishkumar-dhule/reel-interview-code?style=social)](https://github.com/satishkumar-dhule/reel-interview-code)
[![GitHub Forks](https://img.shields.io/github/forks/satishkumar-dhule/reel-interview-code?style=social)](https://github.com/satishkumar-dhule/reel-interview-code)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**⭐ If you find this helpful, please consider giving us a star on GitHub! It helps us reach more developers.**

## 🎯 Features

### Core Learning Experience
- **Interactive Question Reels** - Swipe through technical questions like a social media feed
- **Multi-Channel Learning** - 6 specialized channels covering different tech domains
- **Difficulty Levels** - Beginner, Intermediate, and Advanced questions
- **Timed Practice** - Configurable timer for each question (30-120 seconds)
- **Progress Tracking** - Track completed questions and maintain learning streaks
- **Mermaid Diagrams** - Visual explanations with interactive diagrams
- **Syntax Highlighting** - Code examples with language-specific highlighting

### Channels
1. **System Design** - Infrastructure, Distributed Systems, API Design
2. **Algorithms** - Data Structures, Sorting, Dynamic Programming
3. **Frontend** - React, JavaScript, Performance Optimization
4. **Database** - SQL, NoSQL, Transactions
5. **DevOps** - Kubernetes, CI/CD, Docker, Terraform, AWS, GitOps, Helm, Security
6. **SRE** - Observability, Reliability, SLO/SLI, Incident Management, Chaos Engineering, Capacity Planning

### Analytics & Progress
- **Real-time Stats Dashboard** - View overall progress, streaks, and session counts
- **Activity Heatmap** - Visualize learning patterns over 30/90/365 days
- **Difficulty Breakdown** - Track progress by question difficulty
- **Module Progress** - See completion percentage for each channel
- **Bookmarking** - Mark questions for later review
- **Question Picker** - Jump to any question with grid or list view

### User Experience
- **Dark/Light/Auto Themes** - Customizable interface themes
- **Keyboard Navigation** - Full keyboard support for power users
- **Mobile Responsive** - Optimized for desktop, tablet, and mobile
- **Swipe Gestures** - Navigate questions with swipe on mobile
- **Persistent State** - Automatically saves progress and preferences
- **Offline Support** - Works offline with cached data

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)

### Installation

```bash
# Clone the repository
git clone https://github.com/satishkumar-dhule/reel-interview-code.git
cd reel-interview-code

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
```

### Development

```bash
# Start development server (runs on port 5000)
pnpm run dev

# Or run client and server separately
pnpm run dev:client  # Port 5000
pnpm run dev         # Server on port 5000

# Type checking
pnpm run check
```

### Production Build

```bash
# Build the project
pnpm run build

# Start production server
pnpm run start

# Preview production build
pnpm run preview
```

## 📁 Project Structure

```
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components (Home, Reels, Stats)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/
│   │   │   ├── questions/    # Question data (split by channel)
│   │   │   ├── data.ts       # Data loading and filtering
│   │   │   └── queryClient.ts
│   │   ├── context/          # React context (Theme)
│   │   └── App.tsx
│   └── index.html
├── server/                    # Express backend
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # API routes
│   ├── static.ts             # Static file serving
│   ├── storage.ts            # Database operations
│   └── vite.ts               # Vite dev server setup
├── script/                    # Automation scripts
│   ├── build.ts              # Build script
│   ├── generate-question.js  # Daily question generator (OpenCode)
│   ├── improve-question.js   # Question improvement bot (OpenCode)
│   └── deploy-pages.ts       # GitHub Pages deployment
├── shared/                    # Shared types
│   └── schema.ts
├── .github/workflows/         # GitHub Actions
│   ├── daily-question.yml    # Daily question generation
│   └── improve-question.yml  # Weekly question improvement
└── package.json
```

## 🔄 Automated Workflows

All bots run daily to ensure continuous content management and quality maintenance.

### Daily Question Generator
**Trigger:** Daily at 00:00 UTC (or manual via workflow_dispatch)

Automatically generates new technical interview questions using OpenCode AI:
- Generates 5 new questions per run
- Randomly selects channels and difficulty levels
- Smart deduplication to prevent duplicates
- Adds mermaid diagrams and detailed explanations
- Commits changes and triggers deployment

```bash
# Manual trigger
gh workflow run daily-question.yml -f channel=algorithms -f difficulty=intermediate
```

### Question Improvement Bot
**Trigger:** Daily at 06:00 UTC (or manual via workflow_dispatch)

Automatically improves existing questions:
- Improves 5 questions per run
- Prioritizes oldest questions for review
- Identifies issues: short answers, missing diagrams, truncated content
- Uses OpenCode to enhance content
- Adds/improves mermaid diagrams
- Optimizes word count and formatting
- Commits improvements and triggers deployment

```bash
# Manual trigger
gh workflow run improve-question.yml
```

### Question Deduplication Bot
**Trigger:** Daily at 12:00 UTC (or manual via workflow_dispatch)

Automatically removes duplicate questions:
- Analyzes a random channel each run
- Uses Jaccard similarity (60%+ threshold) to detect duplicates
- Removes at most 1 duplicate per run (keeps oldest, removes newest)
- Maintains question quality and uniqueness
- Provides detailed duplicate analysis
- Commits changes and triggers deployment

```bash
# Manual trigger
gh workflow run deduplicate-questions.yml
```

### Workflow Schedule

| Bot | Time (UTC) | Frequency | Purpose |
|-----|-----------|-----------|---------|
| Daily Question Generator | 00:00 | Daily | Add new questions |
| Question Improvement Bot | 06:00 | Daily | Improve existing questions |
| Question Deduplication Bot | 12:00 | Daily | Remove duplicates |
| Deploy Workflow | On-demand | Triggered | Deploy changes |

This ensures continuous content addition, improvement, and quality maintenance throughout the day.

## 🛠️ Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Radix UI** - Accessible components
- **React Query** - Data fetching
- **Mermaid** - Diagram rendering
- **React Markdown** - Markdown rendering
- **Prism** - Syntax highlighting

### Backend
- **Express.js** - Web framework
- **Node.js** - Runtime
- **PostgreSQL** - Database (optional)
- **Drizzle ORM** - Database toolkit
- **Passport.js** - Authentication (optional)

### DevOps & Automation
- **GitHub Actions** - CI/CD workflows
- **OpenCode AI** - Question generation
- **Vite** - Development server

## 📊 Data Structure

Questions are organized by channel in separate JSON files:

```
client/src/lib/questions/
├── system-design.json
├── algorithms.json
├── frontend.json
├── database.json
├── devops.json
├── sre.json
└── index.ts (exports all questions)
```

Each question has:
```typescript
{
  id: string;              // Unique identifier (e.g., "sd-1")
  question: string;        // Question text
  answer: string;          // Concise answer (50-150 chars)
  explanation: string;     // Detailed markdown explanation
  diagram: string;         // Mermaid diagram
  tags: string[];          // Topic tags
  difficulty: string;      // beginner | intermediate | advanced
  channel: string;         // Channel ID
  subChannel: string;      // Sub-channel ID
}
```

## 🎮 Keyboard Shortcuts

### Home Page
- `Arrow Left/Right` - Navigate channels
- `Enter` - Select channel
- `T` - Toggle theme
- `S` - View stats

### Question Page
- `Arrow Up/Down` - Previous/Next question
- `Arrow Right` - Show answer & mark complete
- `Arrow Left` / `Esc` - Back to home
- `T` - Toggle theme

### Stats Page
- `Esc` - Back to home

## 📱 Mobile Features
- Swipe left/right to navigate questions
- Touch-optimized UI
- Responsive grid layouts
- Mobile-friendly navigation

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Setting Up Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/reel-interview-code.git
   cd reel-interview-code
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make Changes**
   - Follow the existing code style
   - Use TypeScript for type safety
   - Test your changes locally

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Describe your changes clearly
   - Reference any related issues
   - Ensure all tests pass

### Contribution Guidelines

#### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Keep components focused and reusable
- Add comments for complex logic

#### Adding Questions
1. **Manual Addition**
   - Edit the appropriate JSON file in `client/src/lib/questions/`
   - Follow the question structure
   - Ensure unique IDs
   - Add mermaid diagrams where applicable

2. **Automated Generation**
   - The daily workflow automatically generates questions
   - Questions are deduplicated using Jaccard similarity (60%+ threshold)
   - Manual review recommended before merging

#### Adding New Channels
1. Create a new JSON file: `client/src/lib/questions/channel-name.json`
2. Update `client/src/lib/data.ts` to include the new channel
3. Add channel metadata to the channels array
4. Update workflows if needed

#### Improving Questions
- Use the weekly improvement workflow
- Or manually edit questions in their JSON files
- Ensure explanations are comprehensive
- Add/improve mermaid diagrams
- Optimize word count

### Pull Request Process

1. **Before Submitting**
   - Run `pnpm run check` for type checking
   - Test on multiple screen sizes
   - Verify keyboard navigation works
   - Check for console errors

2. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Question addition/improvement
   - [ ] Documentation update

   ## Testing
   How to test these changes

   ## Screenshots (if applicable)
   ```

3. **Review Process**
   - Maintainers will review your PR
   - Address feedback and suggestions
   - Once approved, your PR will be merged

### Reporting Issues

Found a bug or have a suggestion? Please open an issue with:
- Clear description of the problem
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Screenshots if applicable
- Your environment (OS, browser, etc.)

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by spaced repetition learning
- Community contributions and feedback
- OpenCode AI for question generation

## 📞 Support & Community

- **Issues** - Report bugs or request features on [GitHub Issues](https://github.com/satishkumar-dhule/reel-interview-code/issues)
- **Discussions** - Ask questions and share ideas on [GitHub Discussions](https://github.com/satishkumar-dhule/reel-interview-code/discussions)
- **Email** - Contact maintainers for other inquiries

## 🌟 Show Your Support

### Ways to Support
1. **Star the Repository** ⭐ - Click the star button at the top of the repo
2. **Fork & Contribute** 🍴 - Submit PRs with improvements
3. **Share & Spread** 📢 - Tell your friends and colleagues about Learn_Reels
4. **Report Issues** 🐛 - Help us improve by reporting bugs and suggesting features

## 🔗 Links

- [GitHub Repository](https://github.com/satishkumar-dhule/reel-interview-code)
- [Live Demo](https://reel-interview.github.io/)
- [Issues & Discussions](https://github.com/satishkumar-dhule/reel-interview-code/issues)

---

**Happy Learning! 🚀**

Made with ❤️ for developers preparing for technical interviews.

*If you've found this project helpful, please consider starring it and sharing with others!*

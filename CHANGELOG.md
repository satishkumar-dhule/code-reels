# Changelog

All notable changes to Learn_Reels will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-12-12

### Added
- **Timestamp Tracking** - Added `lastUpdated` field to all questions
- **Smart Prioritization** - Improvement bot now prioritizes older questions for review
- **Batch Processing** - Generate and improve 5 questions per workflow run
- **Detailed Summaries** - Enhanced workflow summaries with comprehensive details
- **GitHub Links** - Added issue reporting and star buttons across all pages
- **Open Source Ready** - Added CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- **Daily Question Generator** - Daily automated question generation (00:00 UTC)
- **Question Improvement Bot** - Daily automated question improvement (06:00 UTC)
- **Question Deduplication Bot** - Daily automated duplicate detection and removal (12:00 UTC)
- **Comprehensive Documentation** - Added DEVELOPMENT.md, ROADMAP.md, and GitHub templates

### Changed
- **Workflow Schedule** - All bots now run daily for continuous content management
- **Improvement Bot** - Changed from weekly to daily execution
- **Deduplication Bot** - Changed from weekly to daily execution

### Changed
- Updated README with comprehensive documentation
- Enhanced project metadata in package.json
- Improved workflow summaries with better formatting
- Optimized question deduplication logic

### Fixed
- Fixed OpenCode CLI timeout issues with proper retry logic
- Fixed YAML syntax errors in workflows
- Improved error handling in question generation

## [2.0.0] - 2025-12-10

### Added
- **Split Questions by Channel** - Organized questions into separate JSON files
- **Dynamic Channel Support** - UI automatically supports new channels
- **DevOps & SRE Categories** - Added 13 new DevOps and SRE subcategories
- **Smart Deduplication** - Jaccard similarity-based duplicate detection (60%+ threshold)
- **GitHub Actions Workflows** - Automated daily question generation and improvement

### Changed
- Refactored question data structure for better organization
- Updated data loading to support dynamic channels
- Enhanced progress tracking for new channels

### Fixed
- Fixed question deduplication logic
- Improved question validation

## [1.0.0] - 2025-12-01

### Added
- **Initial Release** - Learn_Reels platform launch
- **6 Learning Channels** - System Design, Algorithms, Frontend, Database, DevOps, SRE
- **Interactive Question Reels** - Swipe-based learning interface
- **Progress Tracking** - Track completed questions and maintain streaks
- **Stats Dashboard** - View learning analytics and activity heatmap
- **Keyboard Navigation** - Full keyboard support for power users
- **Mobile Support** - Responsive design with touch gestures
- **Dark/Light/Auto Themes** - Customizable interface themes
- **Mermaid Diagrams** - Visual explanations with interactive diagrams
- **Syntax Highlighting** - Code examples with language-specific highlighting
- **Bookmarking** - Mark questions for later review
- **Question Picker** - Jump to any question with grid or list view

### Features
- 100+ technical interview questions
- Difficulty levels (Beginner, Intermediate, Advanced)
- Comprehensive explanations with markdown support
- Timed practice mode (30-120 seconds)
- Activity tracking and learning streaks
- Persistent state with localStorage
- Offline support

## Unreleased

### Planned
- [ ] User authentication and cloud sync
- [ ] Question difficulty recommendations
- [ ] Spaced repetition algorithm
- [ ] Community contributions dashboard
- [ ] Mobile app (React Native)
- [ ] API for question access
- [ ] Advanced analytics
- [ ] Question categories customization
- [ ] Multi-language support
- [ ] Video explanations

---

## How to Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

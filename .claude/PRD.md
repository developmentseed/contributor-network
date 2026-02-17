# Product Requirements Document: Contributor Network Visualization

## Executive Summary

**Contributor Network** is an interactive web visualization that showcases Development Seed's contributions to open-source projects. It displays the relationships between Development Seed team members, the repositories they contribute to, and the broader ecosystem of collaborators on those projects.

The tool serves three core purposes:
1. **Showcase OSS Impact** - Demonstrate the value and reach of repositories DevSeed contributes to
2. **Prove Community Effort** - Show that these are truly community-driven projects, not just DevSeed initiatives
3. **Track Contributions Over Time** - Visualize when and how DevSeed has contributed to the ecosystem

---

## Product Overview

### What It Is

A D3.js-based interactive network visualization that:
- Displays DevSeed contributors as nodes arranged in a circle
- Shows repositories as nodes positioned based on collaboration patterns
- Visualizes connections (links) between contributors and repos
- Provides filtering by organization and repository metrics
- Offers rich tooltips showing contributor and repository statistics
- Enables interactive exploration through hover and click interactions

### Live Demo

https://developmentseed.org/contributor-network

### Core Features

#### 1. **Network Visualization**
- Contributors arranged alphabetically around a central ring
- Repositories grouped by ownership pattern (single owner, multiple contributors, collaborations)
- Force-directed layout creates natural clustering of related projects
- Visual flows show which contributors have worked on which repos

#### 2. **Filtering & Discovery**
- Filter by organization (e.g., show only repos where "Conservation Labs" contributed)
- Filter repositories by:
  - Minimum stars
  - Minimum forks
  - Minimum watchers
  - Programming language
- Clear all filters with one click

#### 3. **Interactive Exploration**
- **Hover**: Highlight a contributor or repo to see its connections
- **Click**: Select a contributor to see detailed stats about their contributions
- **Hover + Click**: When a contributor is selected, hover over repos to see the specific link details (commits, dates)

#### 4. **Rich Information Display**
- **Contributor Tooltips**: Name, organization, contribution count, date range
- **Repository Tooltips**: Name, stars, forks, watchers, languages, open issues, community metrics
- **Statistics**: Shows commit counts, contribution spans, community involvement ratios

#### 5. **Visual Design**
- Uses Development Seed brand colors
- Clear typography with readable labels
- Responsive canvas that adapts to window size
- Optimized for both desktop exploration and presentation use

---

## Technical Stack

### Backend (Python)
- **Language**: Python 3.10+
- **Package Management**: `uv` (fast Python package installer)
- **CLI Framework**: Click (for command-line interface)
- **Data Validation**: Pydantic
- **GitHub API Client**: PyGithub
- **Data Format**: TOML config, JSON data files, CSV exports

### Frontend (JavaScript)
- **Visualization**: D3.js (v7)
- **Canvas Rendering**: HTML5 Canvas (for performance)
- **Bundler**: esbuild (via npm scripts)
- **Testing**: Vitest
- **Architecture**: Modular ES6 modules

### Deployment
- **Hosting**: Static site (GitHub Pages or CDN)
- **Build**: GitHub Actions workflow
- **Source**: GitHub repository (`developmentseed/contributor-network`)

---

## Data Flow

```
GitHub API
    ↓
Python CLI (client.py)
    ↓
JSON Files (assets/data/)
    ↓
CSV Generation (csvs command)
    ↓
Configuration (config.toml)
    ↓
D3.js Visualization (index.html)
```

### Data Collection Process

1. **Configuration** (`config.toml`):
   - Specify repositories to track: `owner/repo` format
   - Define contributors: Current DevSeed team, alumni, external collaborators
   - Tag teams/organizations for filtering

2. **Data Fetching** (`uv run contributor-network data`):
   - Queries GitHub API for each configured repo
   - Collects: commits, contributors, stars, forks, languages, topics, etc.
   - Stores raw JSON in `assets/data/`

3. **CSV Generation** (`uv run contributor-network csvs`):
   - Converts JSON to CSV format for web consumption
   - Creates two main files:
     - `repositories.csv` - Repo metadata and metrics
     - `contributors.csv` - Contributor-to-repo relationships and commit details

4. **Site Build** (`uv run contributor-network build`):
   - Bundles JavaScript modules
   - Generates static HTML
   - Outputs to `dist/` for deployment

---

## Current Capabilities

### What Works Today

#### Configuration-Driven
- Edit `config.toml` to add/remove repositories and contributors
- Auto-discover new repositories where multiple DevSeed members contributed
- Support for team/organization grouping

#### Data Collection
- Fetches commit counts, dates, and contributor lists
- Collects repository metrics (stars, forks, watchers, languages, topics, etc.)
- Calculates community health metrics:
  - Total contributors per repo
  - DevSeed vs external contributor split
  - Community contribution ratio

#### Visualization
- Force-directed layout with optimized positioning
- Color-coded by contributor type and repository ownership
- Responsive to window resizing
- Hover states with gradient highlighting
- Click to select for detailed stats
- Smooth animations and transitions

#### Filtering
- Organization-based filtering
- Repository metrics filters (stars, forks, watchers)
- Language filters
- Clear filters button

---

## Target Users & Use Cases

### Primary Users
- **Development Seed Team**: Show impact and community involvement to stakeholders
- **Potential Clients/Partners**: Demonstrate expertise in open-source ecosystems
- **Community Members**: Discover how to contribute to funded projects
- **Media/Press**: Visual story about DevSeed's open-source commitment

### Key Use Cases

1. **Impact Storytelling**
   - "DevSeed contributed to 50+ repositories with 300+ external collaborators"
   - Show the breadth of ecosystem impact

2. **Team Highlights**
   - Interactive way to showcase team member contributions
   - Identify cross-project collaboration patterns

3. **Community Health Assessment**
   - Visualize which projects have active external communities
   - Identify projects that need more community investment

4. **Contribution Discovery**
   - Help new community members find where to contribute
   - See which projects align with their interests

---

## Success Metrics

### Technical Metrics
- **Load Time**: < 3 seconds on typical broadband
- **Interaction Responsiveness**: < 100ms on hover/click
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: 60 FPS on modern browsers

### Business/Product Metrics
- **Engagement**: Avg session duration on the visualization page
- **Discovery**: Click-through rate to individual repositories
- **Reach**: Views per month, geographic distribution
- **Feedback**: User comments/shares on social media

---

## Technical Constraints & Considerations

### Rate Limiting
- GitHub API: 5,000 requests/hour (authenticated)
- Search API: 30 requests/minute
- Statistics API: Subject to REST rate limits with 202 retry behavior
- **Solution**: Aggressive caching, incremental updates, batch operations

### Data Volume
- Current: ~50 repositories, ~30 contributors
- Current approach (JSON/CSV files) works well at this scale
- Migration to SQLite recommended if:
  - > 200 repositories
  - > 500 contributors
  - Need Phase 3+ timeline data

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Canvas support required
- ES6 module support required (no transpilation)
- Not optimized for mobile (desktop-first design)

---

## Configuration & Customization

### Repository Configuration (`config.toml`)
```toml
[repositories]
"owner/repo-name" = "Display Name"

[contributors.devseed]
github_username = "Display Name"

[contributors.alumni]
github_username = "Display Name"
```

### Visualization Customization
- **Colors**: Defined in `src/js/config/theme.js`
- **Layout**: Force simulation parameters, collision detection
- **Font sizes**: Theme configuration (currently under refactoring to increase)
- **Filters**: Defined in filter state management modules

---

## Project Status & Roadmap

See [`CLAUDE.md`](./CLAUDE.md) for current project status and developer orientation.

---

## Development Guidelines

### Code Quality Standards
- **Python**: Typed with mypy, formatted with ruff, tested with pytest
- **JavaScript**: Modular architecture, unit tests with Vitest, <300 lines per file (target)
- **Both**: Clear separation of concerns, single responsibility principle

### Git Workflow
- Main branch: Always deployable
- Feature branches: Descriptive names
- PRs required for all changes
- CI/CD validates tests, linting, type checking before merge

### Documentation
- Code comments for complex logic
- Docstrings for all public functions (Python)
- JSDoc comments for exported functions (JavaScript)
- Runbooks for common operations

---

## License & Attribution

**License**: Mozilla Public License (MPL) 2.0
**Original Work**: [ORCA top-contributor-network](https://github.com/nbremer/ORCA/tree/main/top-contributor-network) by Nadieh Bremer
**Modifications**: Development Seed (2025)

---

*Document Version: 1.0*
*Last Updated: February 2026*
*Maintained by: Development Seed Team*

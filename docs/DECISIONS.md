# Architectural Decisions

Record of key decisions made in the project and their rationale.

---

## Canvas Rendering (Not SVG) ✅ DECIDED

**Decision:** Use HTML5 Canvas for rendering instead of SVG

**Context:**
- Visualization has 200+ interactive nodes and 500+ links
- Need 60 FPS interaction response (hover, drag simulations)
- SVG would create DOM nodes for each element

**Rationale:**
- Canvas provides superior performance for high-density visualizations
- SVG with D3 would create 700+ DOM elements (too slow)
- Canvas allows per-pixel control with animation frame batching
- Accepted tradeoff: Canvas requires custom tooltip/interaction logic (not automatic)

**Consequences:**
- Responsible for all rendering logic (no automatic redraw)
- Must implement custom hit detection (solved with Delaunay triangulation)
- More complex tooltip positioning
- Better performance (60 FPS achievable)

**Alternatives Considered:**
- WebGL: Overkill for this use case, harder to debug
- Hybrid (SVG + Canvas): Complexity not worth it

---

## JSON/CSV Data Files (Not Database) ✅ DECIDED

**Decision:** Store data as JSON files and export to CSV (not database)

**Context:**
- Currently ~50 repositories, ~30 contributors
- Data collected offline (GitHub API → files → visualization)
- Need simple deployment (static site to CDN)

**Rationale:**
- No infrastructure to manage (no database server)
- Easy to debug (human-readable files)
- Version controllable with git
- Simple to onboard new contributors (just `uv sync`)
- Works offline for local development

**Consequences:**
- Must load all data into memory (works fine at current scale)
- No real-time filtering/querying capabilities
- File I/O overhead (negligible at current size)

**When to Reconsider:**
- > 200 repositories
- > 500 contributors
- Need real-time updates
- Multiple services need access

**Migration Path:**
- Stage 1: SQLite (local, single-file) when data volume warrants
- Stage 2: PostgreSQL (if multiple consumers needed)

See `DATA_EXPANSION_PLAN.md` for detailed database discussion.

---

## Modular JavaScript Architecture ✅ DECIDED

**Decision:** Refactor JavaScript from monolith to modular structure

**Context:**
- Original codebase: 3,400+ line `index.js` (from ORCA template)
- Hard to review, test, extend
- Multiple responsibilities: data prep, layout, rendering, interaction

**Rationale:**
- Each module has single responsibility
- Easier to test in isolation
- Improves code review process (<300 lines per file)
- Supports future contributors and maintainability
- Each module becomes focused and reusable

**Progress:**
- 60% complete (29 modules extracted)
- 4,642 lines in modular code
- Main file reduced from 3,400 → 2,059 lines
- ~900 lines remaining to extract

**Target State:**
- Main orchestrator: ~300 lines (thin coordinating layer)
- All other modules: <300 lines each
- Clear data flow: Load → Prepare → Simulate → Render → Interact

**Implementation Approach:**
- Extract gradually (don't rewrite from scratch)
- Keep tests passing after each extraction
- Each commit focuses on one extraction
- No rewrite of logic, just reorganization

---

## Pydantic for Data Validation ✅ DECIDED

**Decision:** Use Pydantic models for all data structures (Python)

**Context:**
- Need to validate GitHub API responses
- Multiple sources of data (GitHub API, config files, generated)
- Type safety and runtime validation needed

**Rationale:**
- Validates structure at entry point
- Type hints catch errors early
- Clear error messages when validation fails
- Automatic JSON serialization
- Works with mypy for static type checking

**Implementation:**
- `models.py` defines Pydantic models for Repository, Link, etc.
- `client.py` converts GitHub API responses to our models
- `config.py` validates TOML configuration

**Alternatives Considered:**
- Dataclasses: Less validation capability
- Plain dicts: No type safety, error-prone

---

## Click for CLI Framework ✅ DECIDED

**Decision:** Use Click for Python CLI commands

**Context:**
- Need multiple subcommands (data, csvs, build, discover, list-contributors)
- Must be easy to use and document
- Should work well with automated workflows

**Rationale:**
- Simple decorator-based command definition
- Automatic help text generation
- Type-safe argument/option handling
- Easy to test

**Commands Implemented:**
- `data` - Fetch from GitHub
- `csvs` - Generate CSV exports
- `build` - Build static site
- `discover` - Find new repos
- `list-contributors` - Show configured contributors

**Alternatives Considered:**
- argparse: More verbose
- Typer: Newer, nice syntax but less mature at time of decision

---

## D3.js Force Simulations (Not Manual Layout) ✅ DECIDED

**Decision:** Use D3 force-directed simulations to position nodes

**Context:**
- Visualization shows relationships between nodes
- Hundreds of edges between nodes
- Need to avoid overlap and show structure

**Rationale:**
- Force simulations naturally cluster related items
- Prevents overlap automatically (collision detection)
- Produces intuitive, readable layouts
- Interactive repositioning possible in future
- D3 provides proven, tested implementation

**Architecture:**
- Four separate simulations for different repo grouping patterns
- Each simulation optimized for its use case
- Contributes to final layout naturally

**Alternatives Considered:**
- Hierarchical tree layout: Doesn't fit network structure
- Grid layout: Too regular, loses relationship information
- Manual positioning: Not scalable as data grows

---

## TypeScript Not Used ✅ DECIDED

**Decision:** Use vanilla JavaScript (ES6 modules) without TypeScript

**Context:**
- Relatively small frontend codebase
- Team comfort with JavaScript
- Deployment to static site (no build step needed)
- Fast iteration during development

**Rationale:**
- No build step overhead during development
- Files immediately available in browser
- Changes visible without refresh
- Simpler development workflow
- Small module size keeps files manageable

**Trade-offs:**
- Less compile-time type checking
- Rely on JSDoc for type hints
- Rely on testing for correctness

**Alternatives Considered:**
- TypeScript: Good for larger projects, but adds complexity
- Flow: Similar issues to TypeScript

---

## No Transpilation (ES6 Modules) ✅ DECIDED

**Decision:** Use modern ES6 modules directly (no Babel transpilation)

**Context:**
- All modern browsers support ES6 modules
- Simplifies development workflow
- Reduces build complexity

**Rationale:**
- Developers can see their changes immediately
- No build step required during development
- Smaller cognitive overhead
- Works fine for this project's scale

**Requirements:**
- Users must have modern browsers (works with all current major browsers)
- Not optimized for IE11 (but that's acceptable)

**Deployment:**
- esbuild for production bundling (if needed)
- Currently deployed as static modules

---

## Separate Simulations by Repo Type ✅ DECIDED

**Decision:** Use different D3 force simulations based on how repos are grouped

**Context:**
- Some repos belong to single owner
- Some repos have single DevSeed contributor
- Some repos have multiple collaborators
- Positioning needs differ for each type

**Rationale:**
- Optimized force parameters for each scenario
- Natural clustering by collaboration pattern
- Cleaner visual hierarchy
- Prevents one type dominating layout

**Implementation:**
```
- ownerSimulation: Repos with single owner
- contributorSimulation: Repos with single DevSeed contributor
- collaborationSimulation: Repos shared between multiple contributors
- remainingSimulation: Contributors outside main circle
```

**Alternatives Considered:**
- Single universal simulation: Would require compromise on parameters
- Manual positioning: Doesn't scale, not reusable

---

## Configuration via TOML ✅ DECIDED

**Decision:** Use TOML for configuration (repositories, contributors)

**Context:**
- Need to specify:
  - Which repos to track
  - Which contributors to include
  - How to group/filter data

**Rationale:**
- Human-readable and writable
- Better than JSON for configuration
- Python stdlib support (via tomli)
- Easy to edit without breaking structure

**Example:**
```toml
[repositories]
"owner/repo" = "Display Name"

[contributors.devseed]
github_username = "Display Name"
```

**Alternatives Considered:**
- JSON: More formal, harder to write
- YAML: Whitespace sensitivity can be error-prone
- Python file: Security concerns, harder to review

---

## Removed ORCA Code ✅ DECIDED

**Decision:** Remove ORCA-specific code and rebrand visualization

**Context:**
- Project started as ORCA (top-contributor-network)
- Needed to make it DevSeed-specific
- ORCA code was a foundation, not meant to be kept

**Changes Made:**
- ✅ Renamed `createORCAVisual` → `createContributorNetworkVisual`
- ✅ Removed ORCA-specific UI elements
- ✅ Updated debug flags (`orca-debug` → `debug-contributor-network`)
- ✅ Removed ORCA theming logic
- ✅ Updated branding to Development Seed colors
- ✅ Kept original MPL license and attribution

**Rationale:**
- Make it clear this is the DevSeed visualization
- Avoid confusion with original ORCA project
- Simplify codebase (removed unused features)
- Establish clear ownership

**Attribution:**
- License: MPL 2.0 (from ORCA)
- Credit: Original ORCA by Nadieh Bremer
- Link: https://github.com/nbremer/ORCA

---

## Ruff for Python Linting/Formatting ✅ DECIDED

**Decision:** Use Ruff instead of Black + Flake8 + isort

**Context:**
- Python code quality tooling landscape fragmented
- Want unified approach
- Need fast, reliable tools

**Rationale:**
- Single tool for format + lint + import sorting
- Very fast (written in Rust)
- Zero-config setup
- Compatible with Black formatting
- Better than individual tools

**Configuration:**
- `pyproject.toml` defines settings
- CI runs `ruff format --check`, `ruff check`, `mypy`

**Alternatives Considered:**
- Black + Flake8: Works but fragmented
- Pylint: Slower, more false positives
- Autopep8: Older approach

---

## Vitest for JavaScript Testing ✅ DECIDED

**Decision:** Use Vitest for unit testing JavaScript

**Context:**
- Need to test modules independently
- Want fast test execution
- Want to test in Node (not browser)

**Rationale:**
- Vitest is fast (built on Vite)
- Compatible with Jest syntax
- Zero-config with Vite setup
- Great for module testing

**Test Coverage:**
- 75+ tests across modules
- Tests for filtering, validation, formatting, helpers
- More tests added as new modules extracted

**Alternatives Considered:**
- Jest: Slower, larger
- Mocha: More setup required
- QUnit: Older approach

---

## No Component Libraries ✅ DECIDED

**Decision:** Build UI with vanilla HTML/CSS, no React/Vue/etc.

**Context:**
- Small focused app (visualization + tooltip + controls)
- Performance critical
- No complex state management needs

**Rationale:**
- Minimal dependencies
- Full control over rendering
- Better performance (Canvas + minimal DOM)
- Simpler deployment (static files)

**Trade-off:**
- More manual DOM management for tooltips
- Build tooltips from scratch

**When to Reconsider:**
- If dashboard complexity grows significantly
- If multiple views needed beyond visualization

---

## Summary of Key Principles

1. **Performance First** - Canvas rendering, modular code, fast tooling
2. **Simplicity** - No unnecessary frameworks, JSON/CSV data, static deployment
3. **Maintainability** - Modularization, testing, clear separation of concerns
4. **Scalability** - Design for growth, but don't over-engineer prematurely
5. **Attribution** - Respect original creators, use proper licensing

---

**Last Updated**: February 2026

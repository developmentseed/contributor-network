# Repository-Centric Discovery Implementation Plan

**Date:** February 2026
**Status:** Implementation Roadmap

## Objective
Implement a repository-first contributor discovery workflow with a simplified, flexible configuration approach.

## Key Changes from Previous Implementation

### 1. Configuration Structure
**Proposed Files:**
- `config.toml`: Main configuration file
- `repositories.txt`: List of tracked repositories
- `core_contributors.csv`: Contributors with metadata

#### Example `config.toml`
```toml
title = "Contributor Network"
organization = "Development Seed"

# Paths to data files
core_contributors_path = "core_contributors.csv"
repositories_path = "repositories.txt"

[visualization]
show_other_contributors = true
show_repo_details = true
max_forks_to_display = 10
```

#### Example `core_contributors.csv`
```
username,type,name
aboydnw,core,Anthony Boyd
gadomski,core,Pete Gadomski
contributor1,other,Contributor One
```

#### Example `repositories.txt`
```
developmentseed/titiler
developmentseed/lonboard
NASA-IMPACT/veda-backend
```

### 2. Configuration Model Updates
```python
class ContributorType(str, Enum):
    CORE = "core"
    OTHER = "other"

class Contributor(BaseModel):
    username: str
    type: ContributorType
    name: str
    additional_metadata: Dict[str, Any] = {}

class VisualizationConfig(BaseModel):
    show_other_contributors: bool = True
    show_repo_details: bool = True
    max_forks_to_display: int = 10

class ContributorNetworkConfig(BaseModel):
    title: str
    organization: str
    core_contributors_path: str = "core_contributors.csv"
    repositories_path: str = "repositories.txt"
    visualization: VisualizationConfig = Field(default_factory=VisualizationConfig)
```

### 3. CLI Discovery Workflow
```python
@cli.group()
def discover():
    """Discover contributors and repositories"""
    pass

@discover.command('from-repositories')
@click.option('--github-token', envvar='GITHUB_TOKEN')
def discover_contributors_from_repos(github_token):
    """
    Discover contributors for repositories in repositories.txt
    
    Workflow:
    1. Read repositories from file
    2. Discover contributors for each repo
    3. Interactively classify contributors
    4. Save to core_contributors.csv
    """
    # Load repositories
    with open('repositories.txt', 'r') as f:
        repositories = [line.strip() for line in f if line.strip()]
    
    # Discover contributors
    all_contributors = []
    for repo in repositories:
        repo_contributors = github_client.discover_contributors(repo)
        all_contributors.extend(repo_contributors)
    
    # Deduplicate contributors
    unique_contributors = {
        c['username']: c for c in all_contributors
    }.values()
    
    # Interactive classification
    classified_contributors = []
    for contributor in unique_contributors:
        click.echo(f"\nContributor: {contributor['username']}")
        click.echo(f"Repositories: {', '.join(contributor.get('repositories', []))}")
        click.echo(f"Total Contributions: {contributor.get('contributions', 'N/A')}")
        
        is_core = click.confirm("Is this a core contributor?")
        
        classified_contributors.append({
            'username': contributor['username'],
            'name': contributor.get('name', contributor['username']),
            'type': 'core' if is_core else 'other'
        })
    
    # Save to CSV
    with open('core_contributors.csv', 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['username', 'type', 'name'])
        writer.writeheader()
        writer.writerows(classified_contributors)
    
    click.echo(f"Discovered and classified {len(classified_contributors)} contributors")

@discover.command('from-contributors')
@click.option('--type', type=click.Choice(['core', 'all']), default='core')
def discover_repos_from_contributors(type):
    """
    Discover repositories contributed to by specified contributors
    
    Workflow:
    1. Read contributors from CSV
    2. Filter by type if specified
    3. Discover repositories
    4. Save to repositories.txt
    """
    # Load contributors
    contributors = []
    with open('core_contributors.csv', 'r') as f:
        reader = csv.DictReader(f)
        contributors = [
            row['username'] for row in reader 
            if type == 'all' or row['type'] == type
        ]
    
    # Discover repositories
    discovered_repos = github_client.discover_repositories_for_contributors(contributors)
    
    # Save to repositories.txt
    with open('repositories.txt', 'w') as f:
        for repo in discovered_repos:
            f.write(f"{repo}\n")
    
    click.echo(f"Discovered {len(discovered_repos)} repositories")
```

### 4. Visualization Preparation
```python
def prepare_visualization_data(config_path='config.toml'):
    """
    Prepare data for visualization based on configuration
    
    1. Load configuration
    2. Read contributors
    3. Read repositories
    4. Apply visualization settings
    """
    # Load configuration
    config = ContributorNetworkConfig.parse_file(config_path)
    
    # Load contributors
    contributors = []
    with open(config.core_contributors_path, 'r') as f:
        reader = csv.DictReader(f)
        contributors = list(reader)
    
    # Load repositories
    with open(config.repositories_path, 'r') as f:
        repositories = [line.strip() for line in f if line.strip()]
    
    # Filter contributors based on visualization settings
    core_contributors = [
        c for c in contributors if c['type'] == 'core'
    ]
    
    other_contributors = (
        [c for c in contributors if c['type'] == 'other']
        if config.visualization.show_other_contributors
        else []
    )
    
    return {
        'core_contributors': core_contributors,
        'other_contributors': other_contributors,
        'repositories': repositories,
        'visualization_settings': config.visualization.dict()
    }
```

### Implementation Phases

1. **Configuration Update**
   - Modify `config.py` to support new structure
   - Update parsing methods
   - Add visualization settings

2. **Discovery Commands**
   - Implement repository-first discovery
   - Create interactive contributor classification
   - Add contributor-to-repository discovery

3. **Visualization Preparation**
   - Update data preparation logic
   - Support filtering based on configuration
   - Maintain existing visualization approach

### Testing Strategy

1. Unit Tests
   - Configuration parsing
   - CSV reading/writing
   - Discovery methods
   - Visualization data preparation

2. Integration Tests
   - End-to-end discovery workflows
   - GitHub API interaction
   - Configuration file handling

3. Manual Testing
   - Try different repository lists
   - Verify contributor classification
   - Check visualization output

### Recommended Workflow for Users

1. Create minimal `config.toml`
2. Create empty `repositories.txt`
3. Run `uv run contributor-network discover from-repositories`
4. Classify contributors interactively
5. Generate visualization

### Potential Future Enhancements

1. More sophisticated contributor classification
2. Additional metadata storage
3. Caching of discovery results
4. More granular visualization settings

---

**Status:** Ready for Implementation
**Last Updated:** February 2026

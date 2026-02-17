# Repository-First Contributor Discovery Implementation Plan

**Date:** February 2026
**Status:** Technical Implementation Guide

## Objective
Implement a repository-first contributor discovery workflow that allows users to:
1. Start with a list of repositories
2. Discover all contributors to those repositories
3. Interactively classify contributors as sponsored or non-sponsored
4. Update configuration and data pipeline automatically

## Phase 1: Configuration Enhancement

### 1.1 Update Configuration Model
**File:** `python/contributor_network/config.py`

```python
from enum import Enum
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

class DiscoveryMode(str, Enum):
    REPOSITORY = "repository"
    CONTRIBUTOR = "contributor"

class DiscoveryConfig(BaseModel):
    mode: DiscoveryMode = DiscoveryMode.CONTRIBUTOR

class Config(BaseModel):
    # Existing configuration fields
    discovery: DiscoveryConfig = Field(default_factory=DiscoveryConfig)
```

### 1.2 Update `config.toml` Support
- Add optional `[discovery]` section
- Ensure backward compatibility with existing configurations

**Example:**
```toml
[discovery]
mode = "repository"  # Optional, defaults to "contributor"
```

## Phase 2: GitHub Client Enhancement

### 2.1 Contributor Discovery Methods
**File:** `python/contributor_network/client.py`

```python
class Client:
    def discover_contributors_for_repositories(
        self, 
        repositories: List[str], 
        min_contributions: int = 1
    ) -> List[Dict]:
        """
        Discover contributors across multiple repositories
        
        Args:
            repositories: List of repository full names
            min_contributions: Minimum number of contributions to include
        
        Returns:
            List of contributor dictionaries with aggregated information
        """
        all_contributors = {}
        
        for repo_name in repositories:
            try:
                repo = self.github.get_repo(repo_name)
                contributors = repo.get_contributors()
                
                for contributor in contributors:
                    if contributor.contributions < min_contributions:
                        continue
                    
                    username = contributor.login
                    if username not in all_contributors:
                        all_contributors[username] = {
                            'login': username,
                            'name': contributor.name or username,
                            'total_contributions': contributor.contributions,
                            'repositories': [repo_name]
                        }
                    else:
                        # Aggregate contributor information
                        existing = all_contributors[username]
                        existing['total_contributions'] += contributor.contributions
                        if repo_name not in existing['repositories']:
                            existing['repositories'].append(repo_name)
            
            except Exception as e:
                click.echo(f"Error discovering contributors for {repo_name}: {e}")
        
        return list(all_contributors.values())
```

## Phase 3: Interactive Classification CLI

### 3.1 Update CLI Command
**File:** `python/contributor_network/cli.py`

```python
@main.command()
@click.option('--mode', type=click.Choice(['repository', 'contributor']), default='contributor')
@click.option('--min-contributions', default=1, help='Minimum contributions to include')
@click.option('--github-token', envvar='GITHUB_TOKEN', help='GitHub API token')
def data(mode, min_contributions, github_token):
    """
    Discover and process contributors based on discovery mode
    
    Modes:
    - repository: Discover contributors for configured repositories
    - contributor: Discover repositories for configured contributors
    """
    config = Config.from_toml(config_path)
    
    if mode == 'repository':
        # Repository-first workflow
        client = Client(github_token)
        
        # Discover contributors for configured repositories
        discovered_contributors = client.discover_contributors_for_repositories(
            config.repositories, 
            min_contributions=min_contributions
        )
        
        # Interactive sponsorship classification
        sponsored_contributors = interactive_sponsorship_classification(
            discovered_contributors
        )
        
        # Update configuration and links
        update_config_with_sponsored_contributors(sponsored_contributors)
        update_links_for_repositories(config.repositories, discovered_contributors)
    
    else:
        # Existing contributor-first workflow
        existing_workflow(config, github_token)

def interactive_sponsorship_classification(contributors):
    """
    Interactively classify contributors as sponsored or non-sponsored
    
    Args:
        contributors: List of contributor dictionaries
    
    Returns:
        List of sponsored contributor usernames
    """
    sponsored_contributors = []
    
    click.echo("\n=== Contributor Classification ===")
    click.echo(f"Total Contributors Discovered: {len(contributors)}")
    
    for contributor in contributors:
        username = contributor['login']
        name = contributor.get('name', username)
        contributions = contributor['total_contributions']
        repositories = contributor['repositories']
        
        # Display contributor details
        click.echo("\n---")
        click.echo(f"Username: {username}")
        click.echo(f"Name: {name}")
        click.echo(f"Total Contributions: {contributions}")
        click.echo(f"Repositories: {', '.join(repositories)}")
        
        # Interactive classification
        is_sponsored = click.confirm(f"Is {username} a sponsored contributor?")
        if is_sponsored:
            sponsored_contributors.append(username)
    
    # Summary
    click.echo("\n=== Sponsorship Classification Summary ===")
    click.echo(f"Total Contributors: {len(contributors)}")
    click.echo(f"Sponsored Contributors: {len(sponsored_contributors)}")
    
    return sponsored_contributors

def update_config_with_sponsored_contributors(sponsored_contributors):
    """
    Update config.toml with newly discovered sponsored contributors
    
    Preserves existing configuration, adds new sponsored contributors
    """
    with open('config.toml', 'a') as f:
        f.write("\n[contributors.sponsored]\n")
        for username in sponsored_contributors:
            f.write(f'{username} = "{username}"\n')  # Placeholder name, can be updated manually
```

## Phase 4: Data Processing and Visualization

### 4.1 Update Links Generation
```python
def update_links_for_repositories(repositories, contributors):
    """
    Generate contribution links for repositories and contributors
    
    Creates link data between repositories and contributors
    Marks sponsorship status in links
    """
    links = []
    for contributor in contributors:
        username = contributor['login']
        is_sponsored = username in get_sponsored_contributors()
        
        for repo in contributor['repositories']:
            link = {
                'author_name': username,
                'repo': repo,
                'tier': 'sponsored' if is_sponsored else 'community'
            }
            links.append(link)
    
    # Save links to appropriate data file
    save_links(links)
```

## Phase 5: Testing and Validation

### 5.1 Test Cases
1. Repository discovery workflow
2. Contributor classification
3. Configuration update
4. Link generation
5. Visualization rendering with new data

### 5.2 Test Scenarios
- Empty configuration
- Partial repository list
- Large number of repositories
- Repositories with few/many contributors
- Edge cases in GitHub API interaction

## Recommended Workflow for Users

1. **Initial Setup**
   ```bash
   # Start with minimal config.toml
   uv run contributor-network data --mode repository
   ```

2. **Interactive Classification**
   - System discovers contributors
   - User classifies each contributor
   - Configuration automatically updated

3. **Subsequent Updates**
   ```bash
   # Add new repositories to config.toml
   uv run contributor-network data
   ```

## Design Principles

1. **Simplicity**: Minimal configuration required
2. **Flexibility**: Supports both repository and contributor discovery
3. **Interactivity**: User-guided contributor classification
4. **Extensibility**: Easy to add more discovery features

## Potential Future Enhancements

1. Machine learning-based contributor classification
2. More sophisticated contribution metrics
3. External identity provider integration
4. Configurable discovery thresholds

---

**Status:** Ready for Implementation
**Last Updated:** February 2026

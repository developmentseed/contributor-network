# Repository-Centric Visualization: Configuration and Data Pipeline Update

**Date:** February 2026
**Status:** Technical Design

## Overview

This document outlines the architectural changes required to support a repository-centric visualization approach, shifting from a contributor-first to a repository-first data discovery and visualization strategy.

## Key Architectural Changes

### 1. Configuration Enhancement

#### Updated `config.toml`
```toml
# New visualization mode configuration
[visualization]
mode = "repository_centric"  # Options: "repository_centric" or "contributor_centric"

# Existing repositories configuration
repositories = [
    "developmentseed/titiler",
    "developmentseed/lonboard"
    # ... other tracked repositories
]

# Optional: Configure sponsored contributors (used in both modes)
[contributors.sponsored]
aboydnw = "Anthony Boyd"
gadomski = "Pete Gadomski"
# Can be same as or different from devseed contributors
```

#### Configuration Model Update
```python
from enum import Enum
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

class VisualizationMode(str, Enum):
    REPOSITORY_CENTRIC = "repository_centric"
    CONTRIBUTOR_CENTRIC = "contributor_centric"

class ContributorConfig(BaseModel):
    sponsored: Dict[str, str] = {}
    devseed: Dict[str, str] = {}
    alumni: Dict[str, str] = {}

class VisualizationConfig(BaseModel):
    mode: VisualizationMode = VisualizationMode.CONTRIBUTOR_CENTRIC
    repository_metrics: Optional[Dict[str, List[str]]] = {
        "watchers": ["total_count"],
        "forks": ["total_count", "organizations"]
    }

class Config(BaseModel):
    repositories: List[str]
    contributors: ContributorConfig
    visualization: VisualizationConfig = Field(default_factory=VisualizationConfig)
```

### 2. Data Pipeline Modifications

#### Enhanced GitHub Client Methods
```python
class GitHubRepositoryEnhancer:
    def __init__(self, github_client, repository):
        self.repository = repository
    
    def get_extended_repository_metrics(self):
        """
        Retrieve comprehensive repository metrics
        
        Returns:
            Dict with extended metrics:
            - Watchers count
            - Forks count
            - Forking organizations
            - Contributor breakdown
        """
        metrics = {
            "watchers": self.repository.watchers_count,
            "forks": self.repository.forks_count,
            "forking_organizations": self._get_forking_organizations(),
            "contributors": self._get_contributor_breakdown()
        }
        return metrics
    
    def _get_forking_organizations(self):
        """
        Discover organizations that have forked this repository
        
        Returns:
            List of unique organization names
        """
        forks = self.repository.get_forks()
        return list(set(fork.owner.login for fork in forks if fork.owner.type == 'Organization'))
    
    def _get_contributor_breakdown(self):
        """
        Detailed contributor analysis
        
        Returns:
            Dict with contribution statistics
        """
        contributors = self.repository.get_contributors()
        sponsored_contributors = [
            c for c in contributors 
            if c.login in self.config.contributors.sponsored
        ]
        
        return {
            "total_count": len(contributors),
            "sponsored_count": len(sponsored_contributors),
            "sponsored_percentage": len(sponsored_contributors) / len(contributors) * 100,
            "top_contributors": [
                {
                    "login": c.login,
                    "contributions": c.contributions,
                    "is_sponsored": c.login in self.config.contributors.sponsored
                } 
                for c in sorted(contributors, key=lambda x: x.contributions, reverse=True)[:10]
            ]
        }
```

#### CLI Data Command Update
```python
@main.command()
@click.option('--mode', type=click.Choice(['repository_centric', 'contributor_centric']))
def data(mode: str):
    """
    Fetch data based on visualization mode
    
    Modes:
    - repository_centric: Discover all contributors for tracked repos
    - contributor_centric: Discover repos for tracked contributors
    """
    config = load_config()
    config.visualization.mode = mode

    if mode == 'repository_centric':
        # New workflow: Start with repositories
        discovered_contributors = discover_contributors_for_repositories(
            config.repositories, 
            sponsored_list=config.contributors.sponsored
        )
    else:
        # Existing workflow: Start with contributors
        discovered_repositories = discover_repositories_for_contributors(
            config.contributors.devseed
        )

    # Save discovered data with extended metrics
    save_discovered_data(discovered_contributors)
```

### 3. Tooltip Enhancement for Repository-Centric View

```python
def generate_repository_tooltip(repository):
    """
    Generate rich tooltip for repository-centric view
    
    Includes:
    - Watchers count
    - Forks count
    - Forking organizations
    - Contributor breakdown
    """
    metrics = repository.get_extended_metrics()
    
    return {
        "name": repository.full_name,
        "description": repository.description,
        "watchers": metrics['watchers'],
        "forks": metrics['forks'],
        "forking_organizations": metrics['forking_organizations'],
        "contributors": {
            "total": metrics['contributors']['total_count'],
            "sponsored_percentage": metrics['contributors']['sponsored_percentage'],
            "top_contributors": metrics['contributors']['top_contributors']
        }
    }
```

### Implementation Strategy

1. **Configuration Update**
   - Modify `config.toml` parsing
   - Add visualization mode support
   - Implement flexible contributor classification

2. **Data Pipeline Modification**
   - Create new repository discovery methods
   - Enhance GitHub API interaction
   - Support both visualization modes

3. **Visualization Adaptation**
   - Update tooltip generation
   - Modify node rendering based on mode
   - Implement mode-specific force simulation

### Recommended Next Steps

1. Implement configuration parsing updates
2. Create comprehensive test suite
3. Develop mode-specific data discovery methods
4. Update visualization rendering logic
5. Perform user testing and gather feedback

## Design Principles

1. **Flexibility**: Support multiple visualization modes
2. **Backward Compatibility**: Existing configs continue to work
3. **Extensibility**: Easy to add new modes or metrics
4. **Clear Separation**: Distinct data pipelines for each mode

---

**Status:** Ready for Implementation
**Last Updated:** February 2026

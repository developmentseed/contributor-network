# Contributor Discovery Strategy

**Date:** February 2026
**Status:** Implementation Guidance

## Overview

This document provides a comprehensive strategy for discovering and managing community contributors beyond the existing configured contributor list.

## Motivation

The current contributor network visualization relies on a predefined list of contributors. To create a more comprehensive view of open-source contributions, we need a robust mechanism to:
- Discover contributors not in the current configuration
- Handle GitHub API rate limits
- Store and manage newly discovered contributors
- Provide flexibility in contributor classification

## Discovery Mechanisms

### 1. Repository-Level Contributor Discovery

```python
from github import Github
from typing import List, Dict
import logging
import time

class ContributorDiscoveryService:
    def __init__(self, github_token: str, config: Dict):
        self.github_client = Github(github_token)
        self.config = config
        self.logger = logging.getLogger(__name__)

    def discover_repo_contributors(
        self, 
        repo_name: str, 
        min_contributions: int = 1
    ) -> List[Dict]:
        """
        Discover contributors for a specific repository
        
        Args:
            repo_name (str): Full repository name (org/repo)
            min_contributions (int): Minimum number of contributions to include
        
        Returns:
            List of contributor dictionaries
        """
        try:
            repo = self.github_client.get_repo(repo_name)
            
            # Paginated contributor retrieval
            contributors = []
            for contributor in repo.get_contributors():
                if contributor.contributions >= min_contributions:
                    contributors.append({
                        'login': contributor.login,
                        'name': contributor.name or contributor.login,
                        'contributions': contributor.contributions,
                        'avatar_url': contributor.avatar_url,
                        'html_url': contributor.html_url
                    })
                
                # Basic rate limit management
                if len(contributors) >= 100:
                    break
            
            return contributors
        
        except Exception as e:
            self.logger.error(f"Error discovering contributors for {repo_name}: {e}")
            return []

    def discover_org_contributors(
        self, 
        org_name: str, 
        repos: List[str] = None
    ) -> Dict[str, List[Dict]]:
        """
        Discover contributors across multiple repositories in an organization
        
        Args:
            org_name (str): GitHub organization name
            repos (List[str], optional): Specific repos to check. If None, fetches all org repos.
        
        Returns:
            Dictionary of repository contributors
        """
        if not repos:
            org = self.github_client.get_organization(org_name)
            repos = [repo.full_name for repo in org.get_repos()]
        
        org_contributors = {}
        for repo_name in repos:
            contributors = self.discover_repo_contributors(repo_name)
            org_contributors[repo_name] = contributors
        
        return org_contributors

## Persistent Storage Strategy
class ContributorStore:
    def __init__(self, storage_path: str = 'discovered_contributors.json'):
        self.storage_path = storage_path
    
    def save_contributors(self, contributors: Dict[str, List[Dict]]):
        """Save discovered contributors to persistent storage"""
        with open(self.storage_path, 'w') as f:
            json.dump(contributors, f, indent=2)
    
    def load_contributors(self) -> Dict[str, List[Dict]]:
        """Load previously discovered contributors"""
        try:
            with open(self.storage_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}

## CLI Integration
@cli.command()
@click.option('--org', required=True, help='GitHub organization to discover contributors')
@click.option('--min-contributions', default=1, help='Minimum contributions to include')
def discover_contributors(org, min_contributions):
    """CLI command to discover contributors for an organization"""
    config = load_config()
    github_token = os.environ.get('GITHUB_TOKEN')
    
    discovery_service = ContributorDiscoveryService(github_token, config)
    store = ContributorStore()
    
    # Discover contributors
    discovered_contributors = discovery_service.discover_org_contributors(org)
    
    # Save to persistent storage
    store.save_contributors(discovered_contributors)
    
    # Optional: Print summary
    for repo, contributors in discovered_contributors.items():
        click.echo(f"{repo}: {len(contributors)} contributors discovered")
```

## Key Design Principles

1. **Flexible Discovery**
   - Repository-level and organization-level discovery
   - Configurable minimum contribution threshold

2. **Rate Limit Management**
   - Pagination support
   - Exponential backoff (not shown in example)
   - Logging of discovery attempts

3. **Persistent Storage**
   - JSON-based storage of discovered contributors
   - Easy to manually curate or modify

4. **Extensibility**
   - Separate concerns: discovery, storage, CLI
   - Easily mockable for testing

## Configuration Considerations

Update `config.toml` to support discovery:

```toml
[contributor_discovery]
min_contributions = 1
rate_limit_delay = 60  # seconds between requests
```

## Recommended Workflow

1. Run discovery command
2. Review discovered contributors
3. Manually add to config or sponsored list
4. Regenerate visualization

## Potential Enhancements

- GraphQL API support for more efficient querying
- More sophisticated rate limit handling
- Machine learning-based contributor classification
- Webhook support for continuous discovery

## Testing Strategy

- Unit tests for discovery methods
- Mock GitHub API for predictable testing
- Integration tests with real GitHub repositories
- Performance testing with large repositories

---

**Status:** Ready for Implementation
**Last Updated:** February 2026

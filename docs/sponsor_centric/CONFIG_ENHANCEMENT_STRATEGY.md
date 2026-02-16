# Configuration Enhancement Strategy

**Date:** February 2026
**Status:** Technical Design

## Overview

This document outlines the strategy for enhancing the configuration system to support sponsored contributor classification while maintaining backward compatibility and flexibility.

## Current Configuration Challenges

1. Single contributor group (`[contributors.devseed]`)
2. No explicit mechanism for highlighting specific contributors
3. Limited flexibility in contributor classification

## Proposed Configuration Structure

```toml
# Existing Contributors (Unchanged)
[contributors.devseed]
aboydnw = "Anthony Boyd"
gadomski = "Pete Gadomski"

# NEW: Optional Sponsored Contributors Section
[contributors.sponsored]
aboydnw = "Anthony Boyd"
# Can include a subset or all of devseed contributors

# Configuration Options
[contributor_classification]
# Specify which group should be treated as "sponsored"
primary_group = "sponsored"  # or "devseed"
fallback_group = "devseed"

# Optional: Additional metadata for contributors
[contributor_metadata]
aboydnw = {
    title = "CTO",
    department = "Engineering",
    start_date = "2020-01-01"
}
```

## Python Configuration Model Enhancement

```python
from pydantic import BaseModel, Field
from typing import Dict, Optional

class ContributorMetadata(BaseModel):
    """Extended metadata for individual contributors"""
    title: Optional[str] = None
    department: Optional[str] = None
    start_date: Optional[str] = None
    github_username: str
    display_name: str

class ContributorClassificationConfig(BaseModel):
    """Configuration for contributor classification"""
    primary_group: str = "sponsored"
    fallback_group: str = "devseed"

class Config(BaseModel):
    """Enhanced configuration model"""
    contributors: Dict[str, Dict[str, str]]
    contributor_classification: ContributorClassificationConfig = Field(
        default_factory=ContributorClassificationConfig
    )
    contributor_metadata: Dict[str, ContributorMetadata] = {}

    def get_sponsored_contributors(self) -> List[str]:
        """
        Retrieve sponsored contributors with intelligent fallback
        
        Priority:
        1. Explicitly defined sponsored group
        2. Fallback group
        3. Empty list
        """
        classification = self.contributor_classification
        primary_group = classification.primary_group
        fallback_group = classification.fallback_group

        # Try primary group first
        sponsored_group = self.contributors.get(primary_group)
        if sponsored_group:
            return list(sponsored_group.keys())

        # Fallback to secondary group
        fallback_sponsored_group = self.contributors.get(fallback_group)
        return list(fallback_sponsored_group.keys()) if fallback_sponsored_group else []

    def get_contributor_metadata(self, username: str) -> Optional[ContributorMetadata]:
        """Retrieve extended metadata for a contributor"""
        return self.contributor_metadata.get(username)
```

## CLI Enhancements

```python
@cli.command()
@click.option('--list-sponsored', is_flag=True, help='List sponsored contributors')
def contributors(list_sponsored):
    """Manage and list contributors"""
    config = load_config()
    
    if list_sponsored:
        sponsored_contributors = config.get_sponsored_contributors()
        for contributor in sponsored_contributors:
            metadata = config.get_contributor_metadata(contributor)
            click.echo(f"{contributor}: {metadata.display_name if metadata else 'N/A'}")
```

## Key Design Principles

1. **Backward Compatibility**
   - Existing configs continue to work
   - Gradual migration path
   - No breaking changes

2. **Flexibility**
   - Multiple contributor groups supported
   - Configurable primary/fallback groups
   - Optional extended metadata

3. **Extensibility**
   - Easy to add new classification strategies
   - Support for rich contributor metadata
   - Minimal changes to existing code

## Recommended Implementation Steps

1. Update `config.py` with new Pydantic models
2. Modify config parsing to support new structure
3. Update CLI commands to leverage new configuration
4. Create migration scripts for existing configs
5. Add comprehensive test coverage

## Potential Future Enhancements

- Machine learning-based contributor classification
- Integration with external identity providers
- More sophisticated metadata management
- Automated contributor discovery and classification

## Testing Strategy

1. **Unit Tests**
   - Verify sponsored contributor retrieval
   - Test fallback mechanisms
   - Validate metadata parsing

2. **Integration Tests**
   - Config file parsing
   - CLI command functionality
   - Interaction with visualization pipeline

## Migration Guide

1. Existing configs will work without modification
2. Gradually introduce `[contributors.sponsored]` section
3. Use `contributor_classification.primary_group` to control behavior
4. Incrementally add `contributor_metadata`

---

**Status:** Ready for Implementation
**Last Updated:** February 2026

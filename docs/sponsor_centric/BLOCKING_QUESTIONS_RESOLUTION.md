# Blocking Questions Resolution

**Date:** February 2026
**Status:** Implementation Guidance

## Overview

This document outlines the resolution strategies for key blocking questions identified during the initial implementation planning of the tiered contributor visualization feature.

## 1. Simulation Strategy for Community Contributors

**Challenge:** No existing "remaining simulation" in the codebase

**Proposed Solution:** Create a new `communityContributorSimulation.js`

### Key Implementation Details

```javascript
import * as d3 from 'd3';

export function createCommunityContributorSimulation(
  communityNodes, 
  centerX, 
  centerY, 
  ringRadius
) {
  // Radius for community contributors (slightly further out than main ring)
  const communityRadius = ringRadius * 1.5;

  return d3.forceSimulation(communityNodes)
    .force('radial', d3.forceRadial(
      // Varying distance from center with some randomness
      d => communityRadius + (Math.random() * 50 - 25),
      centerX, 
      centerY
    ).strength(0.5))
    .force('collide', d3.forceCollide(20))  // Prevent node overlap
    .force('charge', d3.forceManyBody().strength(-30))  // Gentle repulsion
    .stop();
}
```

**Design Principles:**
- Place community contributors outside the main contributor ring
- Prevent node overlap
- Add slight randomness to positioning
- Provide controlled, scattered layout

## 2. Community Contributor Data Pipeline

**Challenge:** Existing pipeline only handles configured contributors

**Proposed Solution:** Enhanced contributor discovery mechanism

### Key Implementation Strategies

1. **Incremental Contributor Discovery**
   - Create new method `discover_repo_contributors()` in `client.py`
   - Implement intelligent rate limit handling
   - Separate storage for discovered contributors

2. **Rate Limit and API Management**
   - Use GitHub GraphQL API for efficient querying
   - Implement exponential backoff
   - Add comprehensive error handling

### Example Implementation Snippet

```python
def discover_repo_contributors(repo):
    """Discover all contributors for a given repository"""
    try:
        # GitHub API call to get all contributors
        contributors = github_client.get_repository_contributors(repo)
        
        # Filter out known contributors from existing config
        known_contributors = set(config.get_all_contributors())
        
        # Discover new contributors
        new_contributors = [
            c for c in contributors 
            if c.login not in known_contributors
        ]
        
        return new_contributors
    except RateLimitError:
        # Implement intelligent rate limit handling
        logger.warning(f"Rate limit hit for {repo}")
        return []
```

## 3. Documentation Completeness

**Resolution:**
- Regenerate full implementation documents
- Add detailed, concrete implementation guidance
- Provide clear code examples and design rationales

## 4. Config Strategy for Sponsored Contributors

**Proposed Configuration Structure:**

```toml
# Existing configuration
[contributors.devseed]
aboydnw = "Anthony Boyd"
gadomski = "Pete Gadomski"

# NEW: Optional sponsored section
[contributors.sponsored]
# Specific subset of contributors to highlight
aboydnw = "Anthony Boyd"

# Configuration option to specify which group is "sponsored"
sponsored_contributor_group = "sponsored"  # or "devseed"
```

**Python Configuration Enhancement:**
```python
class Config(BaseModel):
    sponsored_contributor_group: str = "devseed"
    
    def get_sponsored_contributors(self):
        """Retrieve sponsored contributors, with fallback"""
        sponsored_group = self.contributors.get(
            self.sponsored_contributor_group, 
            self.contributors.get("devseed", {})
        )
        return list(sponsored_group.keys())
```

## Recommended Implementation Approach

1. **Simulation Strategy:**
   - Create `communityContributorSimulation.js`
   - Test with mock data
   - Iterate on positioning algorithm

2. **Contributor Discovery:**
   - Start with simplified discovery method
   - Implement rate limit handling
   - Create separate storage for new contributors

3. **Configuration:**
   - Add optional `[contributors.sponsored]` section
   - Implement fallback mechanism
   - Update config parsing logic

## Next Implementation Steps

- Develop unit tests for new methods
- Create integration tests for GitHub API interaction
- Implement mock GitHub API for testing
- Perform incremental development and validation

---

**Status:** Ready for Implementation
**Last Updated:** February 2026

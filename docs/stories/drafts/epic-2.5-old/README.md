# Epic 2.5 - Original Draft Stories (Archived)

**Date Moved:** 2025-11-13 **Reason:** Stories created before following proper BMM process

## Why These Stories Are Archived

These stories were created prematurely before completing the proper BMM workflow:

1. ❌ **ADR-008 not approved** - Stories 2.5-5 and 2.5-6 based on unapproved ADR
2. ❌ **PRD not updated** - Epic 2.5 not documented in PRD
3. ❌ **Architecture not updated** - Pattern 4 details missing
4. ❌ **No workflow document** - Epic breakdown not formalized
5. ❌ **Critical issues found** - Missing `wasCorrect` tracking, circular dependencies, migration
   conflicts

## Issues Identified

### Critical

- Missing speculation correlation logic (wasCorrect tracking)
- Circular dependency between 2.5-4 and 2.5-5
- ADR-007/ADR-008 alignment mismatch

### Medium

- Incomplete dependencies (2.5-5 missing 2.5-4)
- Migration number conflicts (006 used twice)
- Code duplication (context hashing)

## Correct Process (Being Followed Now)

```
1. Approve ADR-007 and ADR-008
2. Update PRD with Epic 2.5 scope
3. Update architecture.md Pattern 4
4. Create workflow-epic-2.5.md
5. Generate stories properly using /bmad:bmm:workflows:create-story
```

## Files Preserved

- `story-2.5-1.md` - Event Stream + Command Queue + State Management
- `story-2.5-2.md` - Checkpoint & Resume
- `story-2.5-3.md` - AIL/HIL Integration
- `story-2.5-4.md` - Speculative Execution + GraphRAG Feedback Loop
- `story-2.5-5.md` - Episodic Memory Foundation
- `story-2.5-6.md` - Adaptive Thresholds Learning

**Status:** Reference material only. New stories will be generated following BMM process.

## Related Documents

- Analysis: See agent conversation 2025-11-13 for full coherence analysis
- ADR-007:
  `/home/ubuntu/CascadeProjects/AgentCards/docs/adrs/ADR-007-dag-adaptive-feedback-loops.md`
- ADR-008:
  `/home/ubuntu/CascadeProjects/AgentCards/docs/adrs/ADR-008-episodic-memory-adaptive-thresholds.md`
- Spikes:
  - `docs/spikes/spike-agent-human-dag-feedback-loop.md`
  - `docs/spikes/spike-episodic-memory-adaptive-thresholds.md`
  - `docs/spikes/spike-coala-comparison-adaptive-feedback.md`

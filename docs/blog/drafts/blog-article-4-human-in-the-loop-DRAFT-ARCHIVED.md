# Human-in-the-Loop: When Agents Need Guidance

**Auteur:** AgentCards Team
**Date:** Janvier 2025
**Statut:** 🚧 DRAFT - Plan détaillé à compléter
**Sujets:** Human-Agent Collaboration, Runtime Adaptation, Dynamic Planning, Control Systems

---

## PLAN ARTICLE 4: HUMAN-IN-THE-LOOP & DYNAMIC ADAPTATION

**Objectif:** Expliquer Loop 2 (Adaptation) - comment les agents et humains collaborent pendant l'exécution pour adapter les workflows dynamiquement.

**Epic concerné:** Epic 2.5 - Adaptive DAG Feedback Loops (ADR-007, Loop 2)

**Longueur cible:** ~5,000 mots

**Tone:** Accessible, focus sur les use cases concrets et la collaboration homme-machine

---

## Introduction (500 mots)

### Accroche

> "Dans les articles précédents, nous avons exploré des systèmes qui prédisent (Article 2), qui apprennent (Article 3), qui exécutent en parallèle (Article 1). Mais il y a une question fondamentale que nous n'avons pas encore abordée : **Que se passe-t-il quand les prédictions sont fausses ?** Que se passe-t-il quand l'agent rencontre de l'ambiguïté ? Ou pire, quand il s'apprête à faire quelque chose de dangereux ?"

### Le problème du contrôle

**[À COMPLÉTER]**
- Static DAGs (Article 1): Plan fixe, pas d'adaptation
- Speculative DAGs (Article 2-3): Prédictions, mais que faire si wrong?
- Real world: Workflows imprévisibles, context changes, human judgment needed

### Spectrum d'autonomie

**[À COMPLÉTER - Diagramme]**

```
Full Automation          ←→          Full Human Control
     |                                      |
     |─── Agent-in-the-Loop (AIL) ─────────|
     |          (Agent decides)             |
     |                                      |
     |─── Human-in-the-Loop (HIL) ─────────|
     |          (Human approves)            |
```

### Ce que vous allez apprendre

Dans cet article, nous explorons **Loop 2 - Adaptation** :
1. **Agent-in-the-Loop (AIL)** — L'agent prend des décisions pendant l'exécution
2. **Human-in-the-Loop (HIL)** — L'humain approuve les opérations critiques
3. **Dynamic DAG Replanning** — Modifier le workflow à la volée
4. **Multi-turn Conversations** — Dialog agents et workflows complexes
5. **Progressive Discovery** — Workflows qui évoluent avec la compréhension

---

## Section 1: Le dilemme du contrôle (600 mots)

### 1.1 Pourquoi pas full automation?

**[À COMPLÉTER]**
- Scenario: Agent veut "delete production database"
- Risk: Catastrophic if wrong
- Solution: Need human oversight

### 1.2 Pourquoi pas full human control?

**[À COMPLÉTER]**
- Scenario: Agent fait 50 file reads
- Problem: Trop d'approvals → UX terrible
- Solution: Need agent autonomy

### 1.3 Le sweet spot: Adaptive Control

**[À COMPLÉTER]**
- AIL pour routine operations
- HIL pour critical operations
- System décide qui contrôle basé sur risk assessment

---

## Section 2: Agent-in-the-Loop (AIL) (1200 mots)

### 2.1 Qu'est-ce que l'AIL ?

**[À COMPLÉTER]**
- Définition: Agent fait des décisions pendant l'exécution
- Timing: Entre DAG layers (decision points)
- Capabilities: Voir résultats, raisonner, décider next step

### 2.2 Decision Points: Quand l'agent décide

**[À COMPLÉTER - Flow diagram]**

```
┌──────────────────────────────────────────────────────┐
│ WORKFLOW: "Analyze config files"                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Layer 0: Read files                                 │
│   ├─ read config1.json                              │
│   ├─ read config2.xml  ← XML trouvé!                │
│   └─ read config3.json                              │
│                                                      │
│ 🤖 AGENT DECISION POINT                             │
│   "I discovered an XML file, not JSON.              │
│    I need xml:parse instead of json:parse"          │
│                                                      │
│ Command: replan_dag                                 │
│   → Add xml:parse tool                              │
│   → Remove json:parse (for config2)                 │
│                                                      │
│ Layer 1: Parse files (REPLANNED)                    │
│   ├─ json:parse(config1)                            │
│   ├─ xml:parse(config2) ← Nouveau!                  │
│   └─ json:parse(config3)                            │
│                                                      │
│ Layer 2: Continue normally...                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 2.3 Types de décisions AIL

**[À COMPLÉTER]**

1. **Replanning**: Modifier le DAG structure
2. **Skip**: Ignorer une tâche non nécessaire
3. **Retry**: Réessayer une tâche échouée avec params différents
4. **Abort**: Arrêter le workflow (error recovery)

### 2.4 Command Queue: Communication avec l'executor

**[À COMPLÉTER]**

```typescript
interface Command {
  type: 'replan_dag' | 'pause' | 'resume' | 'skip_task' | 'retry_task';
  payload: any;
}

// Exemple: Agent sends command
await commandQueue.push({
  type: 'replan_dag',
  payload: {
    add_tasks: [{ toolId: 'xml:parse', ... }],
    remove_tasks: ['t2']
  }
});
```

### 2.5 Exemple concret: Progressive Discovery Workflow

**[À COMPLÉTER - Narrative walkthrough]**

```
User: "Analyze this dataset"
Agent: "Let me first check the format..."

Layer 0: Inspect file
  → Result: CSV with 10,000 rows

Agent decision: "Large dataset, I'll use sampling"
  → Command: replan_dag
  → Add: sample_csv (first 1000 rows)

Layer 1: Sample & analyze
  → Result: Contains PII (emails)

Agent decision: "PII detected, need redaction"
  → Command: replan_dag
  → Add: redact_pii before analysis

Layer 2: Redact PII
  → Result: Clean dataset

Layer 3: Analyze
  → Result: Summary statistics

Agent: "Analysis complete. Here are the insights..."
```

### 2.6 Benefits de l'AIL

**[À COMPLÉTER]**
- Flexibility: S'adapte aux conditions runtime
- Error recovery: Retries intelligents
- Efficiency: Évite travail inutile
- Progressive: Découvre le workflow au fur et à mesure

---

## Section 3: Human-in-the-Loop (HIL) (1400 mots)

### 3.1 Qu'est-ce que l'HIL ?

**[À COMPLÉTER]**
- Définition: Humain approuve/rejette operations avant execution
- Use cases: Destructive ops, cost thresholds, compliance requirements
- UX: Prompt modal, approval button, reasoning explanation

### 3.2 Quand déclencher HIL ? Risk Assessment

**[À COMPLÉTER - Decision tree]**

```
Operation Risk Assessment:
├─ Is destructive? (delete, overwrite)
│  └─ YES → HIL Required
├─ Cost > threshold? ($10+)
│  └─ YES → HIL Required
├─ Compliance-critical? (production, financial)
│  └─ YES → HIL Required
├─ First-time operation? (unknown tool)
│  └─ YES → HIL Recommended
└─ Routine operation? (read, list)
   └─ NO → Auto-approve (AIL)
```

### 3.3 L'expérience utilisateur HIL

**[À COMPLÉTER - UI mockup ASCII]**

```
┌────────────────────────────────────────────────────┐
│ 🚨 Human Approval Required                        │
├────────────────────────────────────────────────────┤
│                                                    │
│ Operation: github:delete_repository                │
│                                                    │
│ Target: prod-api-backend                           │
│                                                    │
│ Risk Level: ⚠️ CRITICAL (Destructive)             │
│                                                    │
│ Agent Reasoning:                                   │
│ "This repository was marked as deprecated in the   │
│  architecture document. Deleting to clean up."     │
│                                                    │
│ ┌──────────────┐  ┌──────────────┐               │
│ │   Approve    │  │    Reject    │               │
│ └──────────────┘  └──────────────┘               │
│                                                    │
│ [ ] Remember my choice for similar operations      │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 3.4 Approval Outcomes

**[À COMPLÉTER]**

1. **Approved** → Execute task normally
2. **Rejected** → Skip task, mark as user_rejected
3. **Modified** → User changes parameters, then execute
4. **Delegated** → "Ask me again in similar situations"

### 3.5 Multi-turn Conversations

**[À COMPLÉTER - Dialog example]**

```
Agent: "Should I delete repository 'prod-api-backend'?"

User: "Wait, is that the production API?"

Agent: "Checking... Yes, it's tagged 'production'."

User: "Don't delete it! Just archive it instead."

Agent: "Understood. Using github:archive_repository instead."
   → Command: replan_dag (replace delete with archive)

Agent: "Repository archived successfully."
```

### 3.6 State Management: Pause & Resume

**[À COMPLÉTER]**

```typescript
// Workflow execution
await executor.executeLayer(layer1);

// HIL checkpoint
const approval = await promptHuman({
  operation: 'delete_file',
  context: { ... }
});

if (!approval.approved) {
  // Skip task
  await executor.skipTask('t5');
}

// Resume execution
await executor.executeLayer(layer2);
```

### 3.7 Checkpointing: Resume après approval

**[À COMPLÉTER]**
- Workflow paused → state saved to PGlite
- User approve → reload state, continue
- Crash during approval → can resume from checkpoint

---

## Section 4: Dynamic DAG Replanning (1000 mots)

### 4.1 Le problème: Static plans in dynamic world

**[À COMPLÉTER]**
- DAG construit upfront (Article 1)
- Problem: Context changes mid-execution
- Solution: Allow DAG modification on-the-fly

### 4.2 Triggers de replanning

**[À COMPLÉTER]**

1. **Agent discovery**: Découvre nouveau format/tool needed
2. **Error recovery**: Task failed, need alternative approach
3. **Human feedback**: User suggests different path
4. **Context change**: External state changed

### 4.3 DAGSuggester.replanDAG()

**[À COMPLÉTER - Code walkthrough]**

```typescript
class DAGSuggester {
  async replanDAG(
    currentDAG: DAGStructure,
    newContext: Record<string, any>
  ): Promise<DAGStructure> {
    // 1. Query GraphRAG avec nouveau context
    const suggestedTools = await this.graphEngine.findRelevantTools(
      newContext
    );

    // 2. Analyze current DAG
    const completedTasks = currentDAG.tasks.filter(t => t.status === 'completed');
    const pendingTasks = currentDAG.tasks.filter(t => t.status === 'pending');

    // 3. Build new DAG preserving completed work
    const newDAG = {
      ...currentDAG,
      tasks: [
        ...completedTasks,  // Keep completed
        ...suggestedTools.map(createTask)  // Add new
      ]
    };

    return newDAG;
  }
}
```

### 4.4 Exemple: Format Discovery

**[À COMPLÉTER - Narrative]**

```
Original Plan:
  Layer 0: read_file
  Layer 1: json:parse
  Layer 2: analyze

After Layer 0:
  Agent: "File is XML, not JSON!"
  Replan: Replace json:parse with xml:parse

New Plan:
  Layer 0: read_file (✓ completed)
  Layer 1: xml:parse (updated)
  Layer 2: analyze (unchanged)
```

### 4.5 Preserving Completed Work

**[À COMPLÉTER]**
- Key principle: Never re-execute completed tasks
- Reuse results from state
- Only modify future layers

### 4.6 GraphRAG Re-query

**[À COMPLÉTER]**
- Context changed → query GraphRAG again
- New tools may be relevant
- Pattern: Use episodic memory to boost predictions (Article 3)

---

## Section 5: Production Use Cases (800 mots)

### 5.1 Use Case 1: DevOps Pipeline with Approval Gates

**[À COMPLÉTER]**

```
Workflow: Deploy to Production

Layer 0: Run tests (AIL)
  → All pass

Layer 1: Build artifacts (AIL)
  → Success

Layer 2: Deploy to staging (AIL)
  → Success

🧑 HIL CHECKPOINT: Deploy to production?
  User: [Approve]

Layer 3: Deploy to production (HIL approved)
  → Rolling deployment started

Layer 4: Verify deployment (AIL)
  → Health checks pass

Agent: "Deployment successful!"
```

### 5.2 Use Case 2: Data Processing with Progressive Discovery

**[À COMPLÉTER]**
- Start: "Process this file"
- Discover: It's CSV, not JSON
- Replan: Use csv:parse
- Discover: Contains PII
- Replan: Add redact_pii
- Complete: Clean analysis

### 5.3 Use Case 3: Research Assistant with Human Guidance

**[À COMPLÉTER]**
- Agent searches papers
- HIL: "These papers look relevant?"
- User: "Yes, but also search for X"
- Replan: Add X to search
- Continue...

### 5.4 Use Case 4: Compliance-Critical Operations

**[À COMPLÉTER]**
- Financial transaction: HIL required
- Audit trail: All decisions logged
- Approval chain: Multi-level approval
- Rollback: If rejected, undo previous steps

---

## Section 6: Architecture Integration avec Loops 1 & 3 (600 mots)

### 6.1 Loop 1 (Execution) feeds Loop 2 (Adaptation)

**[À COMPLÉTER]**
- Event stream provides real-time data
- Agent sees results, makes decisions
- Command queue executes decisions

### 6.2 Loop 2 (Adaptation) feeds Loop 3 (Meta-Learning)

**[À COMPLÉTER]**
- Decisions captured in episodic memory (Article 3)
- GraphRAG learns from replanning patterns
- Adaptive thresholds improve based on decision outcomes

### 6.3 The Complete Cycle

**[À COMPLÉTER - Full flow diagram]**

```
Loop 1: Execute → Events → State
              ↓
Loop 2: Agent/Human decisions → Commands → Replan
              ↓
Loop 3: Learn from outcomes → Update thresholds/graph
              ↓
Next Workflow: Better predictions, smarter decisions
```

---

## Section 7: Technical Implementation Details (600 mots)

### 7.1 State Management: WorkflowState

**[À COMPLÉTER]**

```typescript
interface WorkflowState {
  workflow_id: string;
  current_layer: number;
  tasks: TaskResult[];  // Completed tasks
  decisions: Decision[];  // AIL/HIL decisions
  commands: Command[];  // Pending commands
  checkpoint: Checkpoint | null;
}
```

### 7.2 Command Queue: AsyncQueue

**[À COMPLÉTER]**
- Producer: Agent/Human
- Consumer: ControlledExecutor
- Commands: pause, resume, replan_dag, skip_task

### 7.3 Checkpoint Strategy

**[À COMPLÉTER]**
- When: After each layer, before HIL
- Storage: PGlite
- Retention: Keep 5 most recent

### 7.4 Event Types

**[À COMPLÉTER]**
- ail_decision: Agent decided
- hil_decision: Human approved/rejected
- dag_replanned: DAG structure changed
- checkpoint_created: State saved

---

## Conclusion (400 mots)

### Recap: Adaptive Control

**[À COMPLÉTER]**
- Loop 2 is the bridge between execution and learning
- AIL for autonomy, HIL for safety
- Dynamic replanning for flexibility

### Why Loop 2 Matters

**[À COMPLÉTER]**
- Real-world workflows are unpredictable
- Agents need flexibility to adapt
- Humans need control over critical operations
- Together: Powerful hybrid intelligence

### The Complete Picture: Loops 1-2-3

**[À COMPLÉTER]**
- Article 1: Foundation (Gateway, DAG)
- Article 2: Prediction (Sandbox, Speculation)
- Article 3: Learning (Episodic, Adaptive)
- Article 4: Adaptation (AIL, HIL, Replanning)

Together: Self-improving, human-guided, adaptive agent system

### What's Next

**[À COMPLÉTER]**
- Implementation: AgentCards building Loop 2 now
- Open questions: When to trigger HIL automatically?
- Community: Share your use cases for human-agent collaboration

---

## Annexes

### A. Decision Tree: AIL vs HIL

**[À COMPLÉTER - Detailed flowchart]**

### B. Command Types Reference

**[À COMPLÉTER - Full command API]**

### C. Pseudocode: ControlledExecutor

**[À COMPLÉTER]**

```typescript
class ControlledExecutor extends ParallelExecutor {
  async execute(dag: DAGStructure): Promise<ExecutionResult> {
    for (const layer of dag.layers) {
      // Execute layer
      await this.executeLayer(layer);

      // Check for commands
      const commands = await this.commandQueue.poll();
      for (const cmd of commands) {
        await this.processCommand(cmd);
      }

      // Checkpoint
      await this.checkpoint();
    }
  }
}
```

---

**À propos d'AgentCards** : AgentCards est une exploration open-source de patterns architecturaux avancés pour les agents MCP. Le code complet et les benchmarks sont disponibles sur GitHub.

**Questions ou feedback ?** Nous serions ravis d'entendre vos retours sur human-in-the-loop patterns. Comment utiliseriez-vous AIL/HIL dans vos workflows ? Contactez-nous sur notre dépôt GitHub.

---

**STATUT DRAFT:**
- ✅ Structure complète définie
- ⏳ Sections à remplir (marquées [À COMPLÉTER])
- ⏳ Diagrammes à créer
- ⏳ Use cases à détailler
- ⏳ Review UX nécessaire

**PROCHAINES ÉTAPES:**
1. Compléter sections narrative
2. Créer diagrammes de flow
3. Ajouter use cases réels
4. Mockups UI pour HIL
5. Review avec équipe
6. Publication après Article 3

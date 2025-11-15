# Adaptive Learning: How AgentCards Learns the Optimal Strategy for Every Workflow

**Auteur:** AgentCards Team
**Date:** Janvier 2025
**Statut:** 🚧 DRAFT - Plan détaillé à compléter
**Sujets:** Machine Learning, Adaptive Systems, Meta-Learning, Self-Improvement

---

## PLAN ARTICLE 3: ADAPTIVE LEARNING

**Objectif:** Expliquer comment AgentCards apprend et s'améliore au fil du temps via l'architecture 3-Loop Learning, la mémoire épisodique, et les seuils adaptatifs.

**Epic concerné:** Epic 2.5 - Adaptive DAG Feedback Loops (ADR-008)

**Longueur cible:** ~5,500 mots

**Tone:** Technique mais accessible, focus sur le "pourquoi" avant le "comment"

---

## Introduction (500 mots)

### Accroche

> "Dans les Articles 1 et 2, nous avons exploré comment AgentCards optimise l'exécution via semantic gateways, DAG parallèle, et exécution spéculative. Mais il y avait un détail caché : **tous les seuils étaient fixes**. Le seuil de confiance pour la spéculation ? 0.7. Le nombre d'outils à exposer ? 20. Ces valeurs fonctionnent... mais sont-elles optimales ? Et si le système pouvait les apprendre ?"

### Le problème des paramètres statiques

**[À COMPLÉTER]**
- Speculation threshold fixe (0.7) → trop agressive pour certains workflows, trop conservative pour d'autres
- Exemple concret : data_analysis workflows (précision critique) vs web_scraping (vitesse prioritaire)
- Le coût d'une mauvaise calibration : computation gaspillée OU opportunités manquées

### Ce que vous allez apprendre

Dans cet article, nous explorons :
1. **Architecture 3-Loop Learning** — Comment le système apprend à 3 niveaux (Execution, Adaptation, Meta-Learning)
2. **Episodic Memory** — Stocker les expériences passées pour améliorer les prédictions futures
3. **Adaptive Thresholds** — Apprendre le seuil de confiance optimal pour chaque type de workflow
4. **Convergence Algorithm** — Comment le système trouve et maintient l'équilibre optimal

---

## Section 1: Le problème des seuils fixes (800 mots)

### 1.1 Rappel: La spéculation avec threshold fixe (Article 2)

**[À COMPLÉTER]**
- Recap rapide de l'exécution spéculative (Article 2, Concept 4)
- GraphRAG prédit le DAG avec score de confiance
- Si confiance > 0.7 → spéculer
- Problème : **le 0.7 est arbitraire**

### 1.2 Le dilemme précision vs vitesse

**[À COMPLÉTER - Tableau comparatif]**

```
Threshold trop bas (0.5):
  ✅ Specule souvent → latence basse
  ❌ Taux d'échec élevé → computation gaspillée

Threshold trop haut (0.9):
  ✅ Taux de succès élevé → peu de gaspillage
  ❌ Specule rarement → opportunités manquées

Threshold optimal (variable selon workflow):
  ✅ Balance précision et vitesse
  ✅ S'adapte au contexte
  ✅ Évolue avec l'expérience
```

### 1.3 Pourquoi un threshold unique ne suffit pas

**[À COMPLÉTER]**
- Différents types de workflows ont des patterns différents
- data_analysis : Prédictions difficiles, besoin de 0.85+ threshold
- file_operations : Prédictions faciles, 0.65 threshold suffit
- Citation benchmark : Success rate varie de 62% à 94% selon workflow type

### 1.4 La solution: Apprentissage adaptatif

**[À COMPLÉTER - Transition]**
- Introduction de l'idée: "Et si chaque workflow type apprenait son propre threshold optimal ?"
- Analogie: Machine learning pour hyperparameter tuning, mais pour l'orchestration d'agents
- Lead-in vers l'architecture 3-Loop

---

## Section 2: Architecture 3-Loop Learning (1200 mots)

### 2.1 Vue d'ensemble: Trois niveaux d'apprentissage

**[À COMPLÉTER - Diagramme ASCII]**

```
┌─────────────────────────────────────────────────────────────┐
│ ARCHITECTURE 3-LOOP LEARNING                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Loop 1: EXECUTION (Real-time, milliseconds)               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ • Event stream observable                             │ │
│  │ • Task execution with results                         │ │
│  │ • Command queue for control                           │ │
│  │ → Capture: What happened?                             │ │
│  └───────────────────────────────────────────────────────┘ │
│                          ↓ Events                           │
│                                                             │
│  Loop 2: ADAPTATION (Runtime, seconds)                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ • Agent-in-the-Loop (AIL) decisions                   │ │
│  │ • Human-in-the-Loop (HIL) approval                    │ │
│  │ • Dynamic DAG replanning                              │ │
│  │ → Act: What should we do differently?                 │ │
│  └───────────────────────────────────────────────────────┘ │
│                          ↓ Decisions                        │
│                                                             │
│  Loop 3: META-LEARNING (Per-workflow, minutes-days)        │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ • Episodic memory storage                             │ │
│  │ • Adaptive threshold learning                         │ │
│  │ • GraphRAG updates                                    │ │
│  │ → Learn: How can we improve for next time?           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Loop 1: Execution - Capture Everything

**[À COMPLÉTER]**
- Event stream avec types d'événements : speculation_start, task_complete, ail_decision, hil_decision
- Capture non-blocking (<1ms overhead)
- Exemple d'event:
  ```typescript
  {
    id: "evt_123",
    type: "speculation_start",
    workflow_id: "wf_789",
    task_id: "t1",
    data: {
      prediction: { toolId: "json:parse", confidence: 0.82 },
      context: { workflowType: "data_analysis" }
    }
  }
  ```

### 2.3 Loop 2: Adaptation - React Intelligently

**[À COMPLÉTER]**
- Décisions pendant l'exécution (AIL/HIL) → détails dans Article 4
- Teaser seulement ici : "Loop 2 permet au système de s'adapter en temps réel. Nous explorerons cela en profondeur dans l'Article 4."
- Focus: Comment les décisions sont capturées pour Loop 3

### 2.4 Loop 3: Meta-Learning - Improve Over Time

**[À COMPLÉTER]**
- Base Loop 3 (Article 2): GraphRAG updates (co-occurrence patterns)
- Extended Loop 3 (cet article): Episodic Memory + Adaptive Thresholds
- Key insight: "Loop 3 ne modifie PAS le code (comme CoALA suggère), il modifie les **paramètres de configuration** (thresholds, weights)"
- Sécurité: Bornes (0.70-0.95), isolation par workflow

### 2.5 Comparaison avec CoALA Framework

**[À COMPLÉTER]**
- CoALA: 2 loops (Decision Cycle, Learning Loop)
- CoALA identifie "meta-learning via code modification" comme théorique mais risqué
- AgentCards: 3 loops avec Loop 2 unique (adaptation runtime)
- AgentCards implémente meta-learning via configuration learning (sûr et pratique)

---

## Section 3: Episodic Memory - The Learning Bridge (1500 mots)

### 3.1 Qu'est-ce que la mémoire épisodique ?

**[À COMPLÉTER]**
- Définition: Stockage d'épisodes (séquences d'événements) d'exécutions passées
- Inspiration: Mémoire épisodique humaine (rappel d'expériences spécifiques)
- Vs mémoire sémantique (GraphRAG = connaissances générales)

### 3.2 Architecture de stockage: Hybrid JSONB + Typed Columns

**[À COMPLÉTER]**
- Schema PGlite:
  ```sql
  CREATE TABLE episodic_events (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- Typed
    task_id TEXT,              -- Typed
    timestamp TIMESTAMPTZ,
    data JSONB NOT NULL        -- Flexible
  );
  ```
- Rationale: Type safety pour queries communes, flexibilité pour event-specific data
- Indexes: workflow_id, event_type, timestamp, GIN sur JSONB

### 3.3 Que stocke-t-on ?

**[À COMPLÉTER - Exemples de chaque type d'event]**

1. **speculation_start**: Prédiction faite, pas encore confirmée
2. **speculation_resolved**: Prédiction confirmée (correct/incorrect)
3. **task_complete**: Tâche terminée avec résultat (success/error)
4. **ail_decision**: Agent a pris une décision
5. **hil_decision**: Humain a approuvé/rejeté

### 3.4 Retrieval: Context-Aware Query

**[À COMPLÉTER]**
- Hash de contexte: `workflowType:data_analysis|domain:finance|complexity:medium`
- Query: Trouver épisodes similaires (même hash)
- Exemple:
  ```typescript
  const relevantEpisodes = await episodicMemory.retrieveRelevant({
    workflowType: 'data_analysis',
    domain: 'finance'
  }, { limit: 50 });
  ```

### 3.5 Boost de confiance via expérience passée

**[À COMPLÉTER]**
- Scenario: GraphRAG prédit `xml:parse` avec confidence 0.68
- Query episodic memory: "xml:parse a-t-il réussi dans workflows similaires ?"
- Trouve 5 episodes où xml:parse a réussi → boost +0.05
- Nouvelle confidence: 0.73 → au-dessus du threshold → spécule!
- Benchmark: Boost typique de +2% à +10% selon historique

### 3.6 Retention Policy & Performance

**[À COMPLÉTER]**
- Hybrid retention: 30 jours OU 10,000 events (whatever comes first)
- Batch writes: Buffer 50 events → flush async
- Performance: <1ms capture, <10ms retrieval, <5MB storage pour 10K events

---

## Section 4: Adaptive Thresholds - Finding the Sweet Spot (1800 mots)

### 4.1 Le problème de calibration

**[À COMPLÉTER]**
- Threshold trop bas → Waste computation
- Threshold trop haut → Miss opportunities
- Goal: Target success rate 80-90% (sweet spot empirique)

### 4.2 Stratégie Conservative-Start

**[À COMPLÉTER]**
- Pourquoi commencer à 0.92 (conservateur) ?
  - Minimiser waste en phase d'apprentissage
  - Éviter oscillation
  - Garantir high success rate initial
- Cold start acceptable: Premiers workflows plus lents, c'est OK

### 4.3 L'algorithme EMA (Exponential Moving Average)

**[À COMPLÉTER - Code commenté]**

```typescript
class AdaptiveThresholdManager {
  private config = {
    initial: 0.92,           // Conservative start
    min: 0.70,               // Don't go below (too risky)
    max: 0.95,               // Don't go above (misses opportunities)
    targetSuccessRate: 0.85, // Sweet spot
    learningRate: 0.05,      // Smoothing factor (5%)
    evaluationWindow: 50     // Samples before adjustment
  };

  adjustThreshold(current: number, successRate: number): number {
    // [À COMPLÉTER - Algorithme détaillé]
    // 1. Calculer optimal threshold basé sur success rate
    // 2. Appliquer EMA smoothing
    // 3. Clamp aux bounds
  }
}
```

### 4.4 Convergence Simulation - Week by Week

**[À COMPLÉTER - Timeline narrative]**

```
Week 1: Cold Start
  Context: data_analysis workflows
  Threshold: 0.92 (initial)
  Speculations: 50
  Success rate: 92%
  Analysis: Too conservative (success rate > 90%)
  Adjustment: Lower to 0.88 (-0.04)

Week 2: Learning Phase
  Threshold: 0.88
  Speculations: 80
  Success rate: 87%
  Analysis: Near target (85%), slight adjustment
  Adjustment: Lower to 0.86 (-0.02)

Week 3: Convergence
  Threshold: 0.86
  Speculations: 100
  Success rate: 85%
  Analysis: ✅ Target achieved!
  Adjustment: Hold at 0.86 (converged)

Week 4+: Stable Operation
  Threshold: 0.86 (stable)
  Success rate: 83-87% (variance within acceptable range)
  System: Auto-optimized for data_analysis workflows
```

### 4.5 Per-Workflow-Type Learning

**[À COMPLÉTER - Tableau comparatif]**

```
Workflow Type      | Converged Threshold | Success Rate | Speculations/Week
-------------------|--------------------|--------------|-----------------
data_analysis      | 0.86               | 85%          | 120
web_scraping       | 0.73               | 88%          | 200
file_operations    | 0.68               | 91%          | 350
api_integration    | 0.82               | 83%          | 150
```

Insight: Différents workflows → différents thresholds optimaux

### 4.6 Détection de convergence

**[À COMPLÉTER]**
- Critère 1: Success rate dans target range (80-90%)
- Critère 2: Variance < 0.02 sur 5 dernières évaluations
- Critère 3: Minimum 50 samples
- Action: Marquer comme "converged", monitoring seulement

### 4.7 Handling Drift - Quand le contexte change

**[À COMPLÉTER]**
- Scenario: Nouveau tool ajouté au workflow type
- Impact: Success rate drop de 85% à 72%
- Détection: Success rate < 80% pendant 3 évaluations
- Action: Re-learn (reset convergence flag, reprendre ajustements)

---

## Section 5: The Symbiotic Learning Loop (800 mots)

### 5.1 Comment tout travaille ensemble

**[À COMPLÉTER - Flow diagram]**

```
1. Execution (Loop 1):
   → Capture speculation outcomes dans episodic memory

2. After 50 speculations:
   → Query episodic memory pour ce workflow type
   → Calculate success rate

3. Meta-Learning (Loop 3):
   → Adjust threshold via EMA algorithm
   → Store new threshold in adaptive_thresholds table

4. Next workflow (même type):
   → Use new threshold
   → Speculation plus optimisée
   → Capture outcomes → feedback loop continues
```

### 5.2 Episodic Memory boosts Adaptive Thresholds

**[À COMPLÉTER]**
- Episodic memory fournit les données pour learning
- Sans episodic memory → pas de success rate tracking
- Symbiosis: Episodic stocke, Adaptive apprend

### 5.3 Adaptive Thresholds creates better Episodes

**[À COMPLÉTER]**
- Meilleur threshold → meilleures prédictions
- Meilleures prédictions → plus d'épisodes réussis
- Plus d'épisodes réussis → meilleur historical context
- Cycle vertueux

---

## Section 6: Production Implications (600 mots)

### 6.1 Cold Start Strategy

**[À COMPLÉTER]**
- Premiers workflows: Conservative (0.92)
- Acceptable: Légèrement plus lents
- Mitigation: Pre-seed avec thresholds par défaut si domaine connu

### 6.2 Privacy & Security

**[À COMPLÉTER]**
- Episodic events: Pas de PII, seulement metadata
- Context hashing: Pas de données sensibles
- Thresholds: Configuration, pas de code

### 6.3 Observability

**[À COMPLÉTER]**
- Metrics dashboard: Threshold evolution par workflow type
- Success rate graphs
- Convergence status indicators

### 6.4 Rollback & Control

**[À COMPLÉTER]**
- Manual override: Forcer un threshold si needed
- Reset: Revenir à initial 0.92 si drift détecté
- Disable learning: Option pour production critique

---

## Section 7: CoALA vs AgentCards - Meta-Learning Comparison (500 mots)

### 7.1 CoALA's Meta-Learning Vision

**[À COMPLÉTER]**
- CoALA propose: "Modify agent code" (procedural memory)
- Status: Theoretical, risky, not implemented
- Concerns: Safety, alignment, bugs

### 7.2 AgentCards' Pragmatic Approach

**[À COMPLÉTER]**
- Apprendre les **paramètres**, pas le code
- Safe: Bounded (0.70-0.95), isolated per workflow
- Practical: Implemented, tested, converges in 2-3 weeks

### 7.3 Future: Toward Code-Level Learning?

**[À COMPLÉTER]**
- Peut-être: Learn DAG structure patterns (not just thresholds)
- Maybe: Learn tool selection preferences
- Careful: Safety boundaries always

---

## Conclusion (500 mots)

### Recap: From Static to Adaptive

**[À COMPLÉTER]**
- Articles 1-2: Static optimizations (gateway, DAG, speculation)
- Article 3: Adaptive optimizations (learning, improving)
- Key difference: System gets **better over time**

### The Vision: Self-Improving Agents

**[À COMPLÉTER]**
- Imagine: Agent qui optimise automatiquement pour chaque use case
- No manual tuning: System finds optimal parameters
- Continuous improvement: Chaque execution améliore le prochain

### What's Next

**[À COMPLÉTER]**
- Article 4: Human-in-the-Loop & Dynamic Adaptation (Loop 2 details)
- Production: AgentCards implementing adaptive learning now
- Community: Open questions sur meta-learning safety

---

## Annexes

### A. Benchmarks Détaillés

**[À COMPLÉTER - Tableaux de données]**
- Convergence time par workflow type
- Success rate evolution
- Storage overhead

### B. Formules Mathématiques

**[À COMPLÉTER]**
- EMA formula détaillée
- Success rate calculation
- Convergence detection algorithm

### C. Pseudocode Complet

**[À COMPLÉTER]**
- AdaptiveThresholdManager class
- EpisodicMemoryStore class
- Integration dans SpeculativeExecutor

---

**À propos d'AgentCards** : AgentCards est une exploration open-source de patterns architecturaux avancés pour les agents MCP. Le code complet et les benchmarks sont disponibles sur GitHub.

**Questions ou feedback ?** Nous serions ravis d'entendre vos retours sur l'adaptive learning. Ces patterns devraient-ils être standardisés dans l'écosystème MCP ? Contactez-nous sur notre dépôt GitHub.

---

**STATUT DRAFT:**
- ✅ Structure complète définie
- ⏳ Sections à remplir (marquées [À COMPLÉTER])
- ⏳ Diagrammes à créer
- ⏳ Benchmarks à ajouter
- ⏳ Review technique nécessaire

**PROCHAINES ÉTAPES:**
1. Compléter sections une par une
2. Créer diagrammes ASCII
3. Ajouter benchmarks réels
4. Review avec équipe technique
5. Publication après Article 2

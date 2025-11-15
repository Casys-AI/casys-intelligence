# Adaptive Workflows : Quand les Agents Apprennent en Cours d'Exécution

**Auteur:** Casys Team
**Date:** Janvier 2025

---

## Le problème des workflows rigides

Les workflows MCP actuels fonctionnent sur un paradigme simple : on construit un plan, on l'exécute séquentiellement, on obtient les résultats. Prévisible, mais **fondamentalement limité**.

Voici le problème : **le monde réel est plein de surprises**.

**Exemple concret :**

```
Tâche : "Analyser les fichiers de configuration"

Workflow pré-défini (rigide) :
1. Lister les fichiers dans /config
2. Parser tous les JSON
3. Générer un rapport

❌ Problème : Et s'il y a aussi des YAML ? Des TOML ? Du XML ?
```

L'agent découvre ces fichiers **pendant** l'exécution, mais il est coincé avec son plan initial. Il ne peut pas s'adapter. Il doit soit ignorer les fichiers inattendus (résultat incomplet), soit redemander à l'utilisateur de relancer le workflow (friction).

**Et si le workflow pouvait s'adapter aux découvertes en temps réel ?**

---

## Agent-in-the-Loop (AIL) : Le Replanning Autonome

L'idée est simple mais puissante : **l'agent peut modifier son plan pendant l'exécution**.

### Comment ça marche

Quand l'agent découvre quelque chose d'inattendu, il peut :
1. **Analyser** ce qu'il vient de découvrir
2. **Décider** d'une nouvelle stratégie
3. **Injecter** de nouvelles tâches dans le workflow
4. **Continuer** l'exécution sans interruption

**Flux technique :**

```
Agent exécute : list_directory("/config")
  ↓ Résultat : 8 JSON, 5 XML, 2 YAML

Agent détecte : "XML et YAML trouvés (imprévus)"
  ↓ AIL Decision Point activé

Agent raisonne : "J'ai besoin de parsers XML et YAML"
  ↓ Query GraphRAG : "tools for XML parsing"

GraphRAG suggère : xml:parse, yaml:load
  ↓ Agent injecte via Command Queue :
  { type: "replan_dag", tools: ["xml:parse", "yaml:load"] }

DAG Executor reconstruit dynamiquement :
  Layer 0: list_directory [COMPLETED]
  Layer 1: [parse_json, parse_xml, parse_yaml] ← Ajoutés à la volée
  Layer 2: aggregate_results

Exécution continue sans restart
```

**Différence clé vs workflows traditionnels :** Aucun restart nécessaire, aucune intervention manuelle, le workflow **s'adapte intelligemment**.

---

## Human-in-the-Loop (HIL) : Validation pour Opérations Critiques

Parfois, l'autonomie totale n'est pas souhaitable. Pour les opérations sensibles, vous voulez une **validation humaine**.

### Quand utiliser HIL

- Opérations destructives (suppression de fichiers, commits Git)
- Décisions business critiques (approbation de dépenses)
- Workflows de sécurité (déploiements en production)
- Validation de qualité (revue de code généré)

### Comment ça marche

Le workflow peut **s'arrêter à un checkpoint** et demander validation :

```
Workflow atteint un checkpoint HIL
  ↓ Génère un résumé :
  "Prêt à déployer 47 fichiers modifiés en production.
   Changements : 342 lignes ajoutées, 89 supprimées.
   Tests : 156/156 passés."

  ↓ Attend validation humaine

Humain répond :
  - ✅ Approve → Workflow continue
  - ❌ Reject → Workflow s'arrête
  - 🔧 Modify → Injecte commandes de modification → Continue
```

**Exemple de modification :**
```json
{
  "decision": "modify",
  "commands": [
    { "type": "exclude_files", "pattern": "*.test.ts" },
    { "type": "add_review_comment", "text": "Deploying core files only" }
  ]
}
```

Le workflow intègre ces modifications et continue.

---

## Architecture 3-Loop Learning

Le vrai pouvoir émerge quand on combine **trois boucles d'apprentissage** opérant à différentes échelles temporelles :

```
╔═══════════════════════════════════════════════════════════════════════╗
║           🔄 ARCHITECTURE 3-LOOP LEARNING                             ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  ⚡ Loop 1: EXECUTION (temps réel - millisecondes)
║  ┌─────────────────────────────────────────────────────────────────┐
║  │  📡 Event Stream        → Observabilité complète                │
║  │  🎛️  Command Queue       → Contrôle dynamique                   │
║  │  💾 State Management    → Reducers automatiques                 │
║  │  💿 Checkpoint/Resume   → Interruption safe                     │
║  └─────────────────────────────────────────────────────────────────┘
║                            ↓ feed into ↓
║  🧠 Loop 2: ADAPTATION (runtime - secondes)
║  ┌─────────────────────────────────────────────────────────────────┐
║  │  🤖 AIL: Agent décide   → Replanning autonome                   │
║  │  👤 HIL: Human valide   → Approbation critique                  │
║  │  🔀 DAG Replanning      → Modification dynamique                │
║  └─────────────────────────────────────────────────────────────────┘
║                            ↓ feedback to ↓
║  🎓 Loop 3: META-LEARNING (continu - long terme)
║  ┌─────────────────────────────────────────────────────────────────┐
║  │  🕸️  GraphRAG Updates   → Knowledge enrichment                  │
║  │  🔗 Co-occurrence       → Pattern learning                      │
║  │  📈 Self-improvement    → Chaque exéc améliore la prochaine     │
║  └─────────────────────────────────────────────────────────────────┘
║
╚═══════════════════════════════════════════════════════════════════════╝
```

### Loop 1 : Observabilité et Contrôle Temps Réel

**Event Stream :** Chaque étape du workflow émet des événements (`workflow_start`, `task_complete`, `checkpoint`, `error`). Observabilité complète en temps réel.

**Command Queue :** L'agent (ou l'humain) peut injecter des commandes **pendant** l'exécution : `{type: "replan_dag"}`, `{type: "abort"}`, `{type: "pause"}`. Non-bloquant, traité entre les layers du DAG.

**State Management :** Reducers automatiques (inspirés de LangGraph MessagesState) maintiennent l'état : messages, tasks, decisions, context. Append/merge automatique.

**Checkpoint/Resume :** Le workflow peut être interrompu et repris. L'état est sauvegardé, permettant de survivre aux crashes ou de permettre une validation HIL asynchrone.

### Loop 2 : Décisions Adaptatives Pendant l'Exécution

**Agent-in-the-Loop (AIL) :** L'agent peut replanifier dynamiquement. Découverte de fichiers XML → Agent injecte `{replan_dag: "parse XML"}` → GraphRAG query → Nouveaux nodes ajoutés au DAG → Exécution continue.

**Human-in-the-Loop (HIL) :** Validation humaine pour opérations critiques. Checkpoint → Résumé généré → Humain review (Approve/Reject/Modify) → Commandes injectées → Workflow continue.

**DAG Replanning :** Contrairement aux DAGs fixes, Casys reconstruit le DAG **pendant l'exécution** via GraphRAG queries. Préserve les tâches complétées, ajoute de nouvelles branches en parallèle.

### Loop 3 : Apprentissage Continu

**GraphRAG Updates :** Après chaque workflow, le système enrichit le knowledge graph.

Exemple : Si `list_directory` et `parse_xml` sont utilisés ensemble, le graph renforce cette relation (weight +1). Le PageRank est recalculé. Les prochains workflows similaires bénéficient des patterns appris.

**Co-occurrence Learning :** Le système apprend quels outils vont ensemble.

Après 50 workflows sur des fichiers de configuration :
- `parse_json` co-occur 95% avec `list_directory`
- `parse_xml` co-occur 60%
- `parse_yaml` co-occur 30%

Résultat : Le 51ème workflow similaire **suggère automatiquement les 3 parsers** dès le départ.

---

## Cas d'usage : Analyse de Fichiers de Configuration

Comparons un workflow rigide vs un workflow adaptatif sur un scénario réel.

```
╔═══════════════════════════════════════════════════════════════════════╗
║  📂 SCÉNARIO: "Analyser fichiers config"                             ║
║  Découverte inattendue: 8 JSON + 5 XML + 2 YAML                      ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  ❌ APPROCHE RIGIDE           │  ✅ APPROCHE ADAPTIVE (3-Loop)        ║
║  ─────────────────────         │  ─────────────────────────────       ║
║                                 │                                     ║
║  DAG fixe: list→json→analyze   │  DAG initial: list→json→analyze      ║
║                                 │                                     ║
║  Execute Layer 0 (list)         │  📡 Loop 1: Execute + Observe       ║
║  ↓ Découvre: XML + YAML found!  │   ↓ Events: XML+YAML detected        ║
║  ❌ Impossible d'adapter        │                                     ║
║     (DAG is fixed)              │  🤖 Loop 2: AIL Decision            ║
║                                 │   → Agent: "Need XML+YAML parsers"  ║
║  Continue avec JSON only        │   → GraphRAG query                 ║
║  ↓                              │   → Inject new nodes: xml, yaml    ║
║  ⚠️  Résultat PARTIEL            │                                   ║
║  (5 XML + 2 YAML ignorés)       │  Nouveau DAG (dynamique):          ║
║                                 │  Layer 1: [json, xml, yaml] ←🔀    ║
║  User: "Et les XML?"            │   ↓ Execute parsers en parallel    ║
║  → Must restart workflow ↻      │                                    ║
║                                 │  🎓 Loop 3: Meta-Learning          ║
║  ════════════════════           │   → Pattern "config" appris        ║
║  Résultat: ❌ Incomplet         │   → Next time: suggère les 3       ║
║  Restart: ✋ Required            │                                    ║
║  Learning: 🚫 None              │  ════════════════════               ║
║                                 │  Résultat: ✅ COMPLET               ║
║                                 │  Restart: 🚫 Not needed             ║
║                                 │  Learning: ✅ Continuous            ║
║                                 │                                     ║
╚═══════════════════════════════════════════════════════════════════════╝
```

**Résultat concret :**
- Workflow rigide : 53% des fichiers traités (8/15), restart requis
- Workflow adaptatif : 100% des fichiers traités (15/15), 0 restart

**Et au 10ème workflow similaire :**
- Workflow rigide : Toujours 53%, toujours restart
- Workflow adaptatif : Suggère automatiquement les 3 parsers dès le départ (Loop 3 apprentissage)

---

## Positionnement : Ce qui n'existe pas ailleurs

### Anthropic Code Execution

**Ce qu'ils font :** Exécution de code déterministe dans un sandbox sécurisé.

**Ce qu'ils ne font pas :** Pas de replanning dynamique. Le code est généré une fois, exécuté, terminé. Si découverte inattendue → échec ou résultat partiel.

### Claude Code Subagents

**Ce qu'ils font :** Délégation à des agents spécialisés pour tâches complexes.

**Ce qu'ils ne font pas :** Les subagents opèrent indépendamment. Pas de replanning du workflow parent basé sur les découvertes du subagent. Pas de meta-learning entre workflows.

### Casys MCP Gateway

**Ce que nous faisons différemment :**

| Fonctionnalité | Anthropic | Claude Code | Casys |
|----------------|-----------|-------------|-------|
| **Code execution** | ✅ | ❌ | ✅ |
| **Replanning dynamique (AIL)** | ❌ | ❌ | ✅ |
| **Validation humaine (HIL)** | ❌ | ❌ | ✅ |
| **Meta-learning GraphRAG** | ❌ | ❌ | ✅ |
| **DAG reconstruction runtime** | ❌ | ❌ | ✅ |

---

## Implémentation Technique

### Architecture Modulaire

Les adaptive loops sont implémentés via plusieurs composants qui travaillent ensemble :

**Event Stream :**
- 9 types d'événements (workflow_start, task_complete, checkpoint, error, etc.)
- Emission temps réel via observateurs
- Utilisé pour logging, debugging, monitoring

**Command Queue :**
- File de commandes non-bloquante
- Injection possible pendant exécution (replan_dag, pause, abort, modify)
- Traitement entre layers du DAG

**State Management :**
- Reducers inspirés de LangGraph
- État workflow : messages, tasks, decisions, context
- Merge automatique des updates

**DAG Replanning :**
- GraphRAG query basé sur découvertes
- Construction dynamique de nouveaux nodes
- Préservation des tasks complétées (pas de re-exécution)

### Métriques de Performance

Benchmarks réels sur workflows de production :

**Speedup AIL replanning :** 5x plus rapide que restart manuel
- Workflow rigide avec restart : 23.4s
- Workflow adaptatif avec AIL : 4.7s

**State update latency :** 0.003ms (target <1ms)

**Event emission overhead :** <5ms P95

**Command injection latency :** <10ms P95

---

## Cas d'Usage Concrets

### 1. Analyse de Codebase Multi-Langage

```
Tâche : "Analyser ce projet et identifier les dépendances"

DAG initial : Analyse Python
  ↓ Découvre : TypeScript, Rust aussi présents

AIL Decision : Ajoute analyzers TS et Rust
  ↓ Nouveau DAG : [Python, TypeScript, Rust] en parallèle

Résultat : Analyse complète en une seule exécution
```

### 2. Pipeline CI/CD avec Validation Humaine

```
DAG : build → test → deploy

HIL Checkpoint avant deploy :
  "156 tests passés, prêt à déployer"

Humain : Approve

Workflow : Continue vers production
```

### 3. Data Pipeline avec Découverte de Format

```
Tâche : "Importer les données du répertoire /exports"

DAG initial : Import CSV
  ↓ Découvre : CSV, JSON, Parquet

AIL : Ajoute parsers JSON et Parquet
  ↓ Tous les formats traités automatiquement

Loop 3 : Prochaine fois, suggère les 3 parsers d'entrée
```

---

## Conclusion

Les workflows MCP traditionnels fonctionnent sur un paradigme linéaire : plan → exécute → termine. Mais le monde réel est plein de surprises.

**Les Adaptive Workflows transforment ce paradigme** :

- **Loop 1 (Execution)** : Observabilité complète et contrôle dynamique en temps réel
- **Loop 2 (Adaptation)** : L'agent (AIL) et l'humain (HIL) peuvent modifier le plan pendant l'exécution
- **Loop 3 (Meta-Learning)** : Le système apprend des patterns et s'améliore automatiquement

**Résultat :** Des workflows qui découvrent, s'adaptent, apprennent, et s'améliorent continuellement.

C'est cette capacité d'adaptation intelligente qui distingue Casys des autres approches et qui rend possible des workflows vraiment robustes et auto-améliorants.

---

**À propos de Casys MCP Gateway** : Casys est une plateforme d'orchestration intelligente pour agents MCP, introduisant les concepts d'Adaptive Feedback Loops (AIL/HIL) et de meta-learning via GraphRAG. Open source bientôt.

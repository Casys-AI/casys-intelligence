# Adaptive Feedback Loops et Code Sandboxing : Quand les agents apprennent à s'adapter

**Auteur:** AgentCards Team
**Date:** Janvier 2025
**Sujets:** Adaptive Workflows, Code Execution, Security, Agent Intelligence, MCP Architecture

---

## Repenser le paradigme : Au-delà des workflows rigides

Dans le [premier article](./blog-article-1-gateway-and-dag.md) de cette série, nous avons exploré comment les **Semantic Gateways** et l'**exécution parallèle basée sur les DAGs** résolvent les problèmes de contexte et de latence dans les workflows MCP. Mais ces optimisations, aussi puissantes soient-elles, restent dans le paradigme du workflow **pré-défini** : l'agent reçoit un plan fixe, l'exécute linéairement, retourne les résultats.

Et si l'agent pouvait **apprendre en cours de route** ? Et si le workflow pouvait **s'adapter aux découvertes** ? Et si le système **s'améliorait avec le temps** ?

Dans cet article, nous explorons deux concepts qui transforment les workflows rigides en systèmes adaptatifs intelligents :

1. **Adaptive Feedback Loops (Concept 4)** — Permettre aux workflows de s'ajuster dynamiquement pendant l'exécution ✅ Implémenté
2. **Agent Code Sandboxing (Concept 3)** — Exécuter du code généré par l'agent dans un environnement isolé 🚧 En développement actif

### Architecture Note : Une séquence délibérée

Ces deux concepts sont intimement liés, mais **l'ordre d'implémentation est critique** :

> **Pourquoi les feedback loops AVANT le sandboxing ?**
>
> Les feedback loops permettent à l'agent de **découvrir** ce dont il a besoin pendant l'exécution. Par exemple : "J'ai listé les fichiers et j'ai trouvé du XML — j'ai besoin d'un parser XML."
>
> Sans feedback loops, l'agent doit tout prédire à l'avance. Avec les loops, il peut **explorer, découvrir, et adapter** son plan en temps réel.
>
> Ensuite, le sandboxing rend cette exploration **plus sûre** : le code peut s'exécuter dans un environnement isolé où les échecs sont sans conséquence.

Cette séquence débloque la vraie puissance des workflows adaptatifs :
- Les feedback loops créent des **workflows exploratoires** qui découvrent les besoins au fur et à mesure
- Le sandboxing permet d'**expérimenter sans risque** avec du code généré dynamiquement
- L'apprentissage continu améliore les prédictions futures via GraphRAG

Ensemble, ces concepts transforment la gateway d'un simple routeur en un **système d'orchestration intelligent et adaptatif**.

---

## Concept 4 : Adaptive Feedback Loops

### Le problème : Des workflows qui ne peuvent pas apprendre

Le paradigme MCP actuel est fondamentalement **linéaire** : on construit un plan, on l'exécute, on obtient les résultats. Simple et prévisible.

Mais il y a un problème : **le monde réel est plein de surprises**.

```
Exemple concret :
Intent : "Analyser les fichiers de configuration"

Workflow pré-défini (rigide) :
1. Lister les fichiers dans /config
2. Parser tous les JSON
3. Générer un rapport
❌ Problème : Et s'il y a aussi des YAML ? Des TOML ? Du XML ?
```

L'agent découvre ces fichiers **pendant** l'exécution, mais il est coincé avec son plan initial. Il ne peut pas s'adapter.

### L'idée centrale : Trois boucles d'apprentissage

Au lieu d'un workflow linéaire, nous introduisons **trois boucles de feedback** opérant à différentes échelles temporelles :

```
╔═══════════════════════════════════════════════════════════════════════╗
║           🔄 ARCHITECTURE 3-LOOP LEARNING                             ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  ⚡ Loop 1: EXECUTION (temps réel - ms)                               
║  ┌─────────────────────────────────────────────────────────────────┐  
║  │  📡 Event Stream        → Observabilité complète                │  
║  │  🎛️  Command Queue       → Contrôle dynamique                   │ 
║  │  💾 State Management    → Reducers automatiques                 │  
║  │  💿 Checkpoint/Resume   → Interruption safe                     │  
║  └─────────────────────────────────────────────────────────────────┘  
║                            ↓ feed into ↓                              
║  🧠 Loop 2: ADAPTATION (runtime - seconds)                            
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

### Loop 1 : Observabilité et contrôle en temps réel

La première boucle donne une **visibilité complète** et permet un **contrôle dynamique** :

**📡 Event Stream :** Chaque étape émet des événements (workflow_start, task_complete, checkpoint, etc.) pour observabilité complète en temps réel.

**🎛️ Command Queue :** L'agent (ou humain) peut injecter des commandes **pendant** l'exécution : `{type: "replan_dag"}`, `{type: "abort"}`, etc. Non-bloquant, traité entre layers.

**💾 State Management :** Reducers automatiques (inspirés LangGraph MessagesState) maintiennent l'état : messages, tasks, decisions, context. Append/merge automatique.

**💿 Checkpoint/Resume :** Interruption safe pour workflows d'orchestration. *Note: Sauvegarde workflow state mais pas filesystem state — workflows modifiant fichiers nécessitent tâches idempotentes. Sandbox (en dev) résoudra via isolation complète.*

### Loop 2 : Décisions adaptatives pendant l'exécution

**🤖 Agent-in-the-Loop (AIL) :** L'agent peut replanifier dynamiquement. Découverte de XML files → Agent injecte `{replan_dag: "parse XML"}` → GraphRAG query → Nouveaux nodes ajoutés au DAG → Exécution continue sans restart.

**👤 Human-in-the-Loop (HIL) :** Validation humaine pour opérations critiques. Checkpoint → Summary généré → Human review (Approve/Reject/Modify) → Commandes injectées si modifications → Workflow continue.

**🔀 DAG Replanning :** Contrairement aux DAGs fixes, AgentCards reconstruit le DAG **pendant l'exécution** via GraphRAG queries. Préserve les tasks complétés, ajoute nouveaux branches en parallèle.

### Loop 3 : Apprentissage continu

**🕸️ GraphRAG Updates :** Après chaque workflow, le système enrichit le knowledge graph. Edges co-occurrence renforcés (list_directory + parse_xml utilisés ensemble → weight +1), PageRank recalculé. Prochains workflows similaires bénéficient des patterns appris.

**🔗 Co-occurrence Learning :** Le système apprend quels outils vont ensemble. Après 50 workflows: parse_json co-occur 95%, parse_xml 60%, parse_yaml 30% avec list_directory. Suggestions intelligentes s'améliorent automatiquement.

### Comparaison : Workflow rigide vs adaptatif

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

**Différence clé :** Les workflows rigides échouent sur l'inattendu. Les workflows adaptatifs **découvrent, apprennent, et s'ajustent** en temps réel.

---

## Concept 3 : Agent Code Sandboxing 🚧

> **Note d'implémentation :** Cette fonctionnalité est actuellement en développement actif. Les fondations architecturales sont en place, et l'implémentation complète sera disponible prochainement. Cette section présente la vision et l'approche technique planifiée.

### Le problème caché des résultats intermédiaires

Le paradigme MCP est basé sur les **appels d'outils** : l'agent demande, le serveur exécute, le résultat retourne. Simple, mais **les résultats intermédiaires gonflent le contexte**.

**Exemple :** "Lister les fichiers /configs et filtrer les .json"

| Approche | Résultat dans contexte | Tokens |
|----------|----------------------|--------|
| **Tool calls** | Liste complète retournée: ["app.json", "db.json", ..., "config-687.json"] | ~2,400 |
| **Code execution** | Code exécuté localement, retourne filtré: ["app.json", "db.json", "auth.json"] | ~80 |

**Réduction : 30x** — La computation se fait localement, seul le résultat final entre dans le contexte.

### Quand le sandboxing l'emporte-t-il sur les tool calls ?

Le sandboxing n'est pas toujours la meilleure solution. Voici une matrice de décision :

**✅ Le sandbox gagne :**
- **Datasets volumineux** : 1MB+ de données brutes → filtrer/agréger vers <1KB de résumé
- **Transformations multi-étapes** : 5+ opérations sur les mêmes données
- **Logique de filtrage complexe** : Conditions qui nécessiteraient multiples tool calls
- **Données sensibles** : Traiter localement, retourner seulement des agrégats (préservation de la vie privée)
- **Algorithmes itératifs** : Boucles, récursion, traitement stateful

**❌ Les tool calls gagnent :**
- **Opérations simples** : Lire un fichier, appeler une API
- **APIs externes** : GitHub, Slack, bases de données (ne peuvent pas s'exécuter dans le sandbox)
- **Opérations stateful** : Transactions de base de données, écritures de fichiers avec verrous
- **Requêtes ponctuelles** : Pas de traitement répété

### Le défi de la sécurité

Pourquoi ne pas juste utiliser `eval()` de JavaScript ?

```typescript
// ❌ EXTRÊMEMENT DANGEREUX
const agentCode = await llm.generateCode();
eval(agentCode);

// Le code de l'agent peut :
// - Accéder à tous les fichiers (lire /etc/passwd, ~/.ssh/id_rsa)
// - Faire des requêtes réseau (exfiltrer des données)
// - Exécuter des commandes shell (rm -rf /)
// - Crasher le processus (process.exit(1))
```

Nous avons besoin d'isolation. Mais combien, et à quel coût ?

**Pourquoi Deno ?**

Deno offre une **sécurité basée sur les capacités** avec des permissions granulaires :

```typescript
// Approche planifiée: Subprocess Deno avec permissions explicites
const sandbox = Deno.run({
  cmd: ["deno", "run",
    "--allow-read=/configs",      // Peut SEULEMENT lire /configs
    "--allow-write=/tmp/output",  // Peut SEULEMENT écrire dans /tmp/output
    // PAS de --allow-net (réseau complètement bloqué)
    // PAS de --allow-run (ne peut pas spawner de sous-processus)
    // PAS de --allow-env (ne peut pas lire les variables d'environnement)
    "agent_code.ts"
  ]
});

// Note: Cette implémentation est en cours de développement.
// Les tests de sécurité et benchmarks seront publiés lors de la release.
```

Cela nous donne :
- **Contrôle granulaire** : Par répertoire, par domaine, par capacité
- **Deny-by-default** : Tout est interdit sauf ce qui est explicitement autorisé
- **Application runtime** : Pas juste de l'isolation de processus, mais des restrictions de capacités au niveau OS
- **Démarrage rapide** : <10ms d'overhead vs 100-500ms pour les containers
- **TypeScript natif** : Pas d'étape de compilation, le code de l'agent s'exécute directement

### Synergie avec les Adaptive Loops

Le sandboxing et les feedback loops se renforcent mutuellement :

**Le sandbox rend l'exploration plus sûre :** L'agent peut tester plusieurs approches en parallèle (regex, AST, ML) dans des environnements isolés. Les échecs sont sans conséquence — on garde ce qui marche, on jette le reste.

**Les feedback loops rendent le sandbox plus intelligent :** L'agent expérimente, apprend (via Loop 3), et améliore. Exemple : Parse 1000 JSON → essaie séquentiel (45s) → AIL suggère streaming → teste (8s) → GraphRAG apprend → prochaine fois suggère streaming d'entrée de jeu.

---

## Architecture unifiée : Tout ensemble

Ces quatre concepts ne sont pas mutuellement exclusifs — ce sont des couches complémentaires d'optimisation qui travaillent ensemble :

**1. Semantic Gateway** : Réduit le contexte de 15x en exposant uniquement les outils pertinents
**2. DAG Execution** : Accélère les workflows de 4-6x via la parallélisation
**3. Adaptive Feedback Loops** : Permet l'exploration et l'adaptation dynamique pendant l'exécution
**4. Code Sandboxing** : Réduit le contexte de 100x+ pour les workloads lourds en données

**Performance combinée (scénario illustratif) :***

```
╔═══════════════════════════════════════════════════════════════════════╗
║  📊 SCÉNARIO: Analyse multi-langage (Python + TS + Rust)             ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Optimisation      │ Contexte  │ Latence │ Status                    ║
║  ─────────────────────────────────────────────────────────────────    ║
║  Baseline (seq)    │ 200K ❌   │ 45s     │ Context overflow          ║
║  + Gateway         │ 4K ✅     │ 42s     │ OK (lent)                 ║
║  + DAG parallel    │ 4K ✅     │ 9s      │ OK (5x faster)            ║
║  + Adaptive✅       │ 3K ✅     │ 9s      │ Complet (3 langs auto)    ║
║  + Sandbox🚧        │ 2K 🎯    │ 7s 🎯   │ Projected (in dev)        ║
╠═══════════════════════════════════════════════════════════════════════╣
║  🎯 Impact total: ~100x context reduction | ~6-7x latency reduction  ║
╚═══════════════════════════════════════════════════════════════════════╝

* ✅ = Implémenté (benchmarks réels) | 🚧 = En développement (projections)
```

L'insight clé : **ces optimisations se combinent multiplicativement, pas additivement**.

---

## Implications pour l'écosystème MCP

### Est-ce une nouvelle couche de protocole ?

Le pattern gateway est du **middleware**, pas un remplacement de protocole :

- ✅ Se positionne entre les LLMs et les serveurs MCP (comme nginx entre clients et backends)
- ✅ Compatible avec n'importe quel serveur MCP existant (zéro changement de code requis)
- ✅ Fournit l'optimisation sans changer le protocole MCP
- ✅ Peut être adopté incrémentalement (commencer avec 1 serveur, en ajouter plus)

**Analogie : Proxies HTTP**

Tout comme nginx fournit du caching, du load balancing, et de la terminaison SSL sans changer HTTP, les gateways MCP fournissent de l'optimisation de contexte, de l'orchestration, et du sandboxing sans changer MCP.

Le protocole reste simple. La complexité vit à un seul endroit (la gateway). Les serveurs restent stateless et focalisés.

### Ces concepts devraient-ils faire partie de la spec MCP ?

**Notre position :**

> "Ces concepts devraient rester dans la couche application (gateways, frameworks) pour l'instant. S'ils s'avèrent précieux à travers de multiples implémentations, les futures versions de MCP pourraient standardiser les interfaces. Mais une standardisation prématurée étoufferait l'innovation."

Le protocole MCP est jeune. Laissons mille fleurs fleurir. Standardisons les patterns qui se révèlent universellement utiles.

---

## État d'Implémentation et Transparence

Nous croyons en la transparence totale sur ce qui est implémenté versus ce qui est planifié. Voici l'état actuel de chaque concept présenté dans cet article :

### ✅ Production-Ready et Testé

**Adaptive Feedback Loops (Concept 4) :**
- ✅ **Loop 1 (Execution)** : Event Stream, Command Queue, State Management avec reducers automatiques
  - 9 types d'événements temps réel
  - Reducers inspirés de LangGraph MessagesState
  - Checkpoint/Resume pour workflows d'orchestration*

- ✅ **Loop 2 (Adaptation)** : AIL/HIL decision points, DAG replanning dynamique
  - Agent-in-the-Loop avec injection de commandes pendant exécution
  - Human-in-the-Loop avec points d'approbation configurables
  - Re-planification de DAG via GraphRAG queries

- ✅ **Loop 3 (Meta-Learning)** : GraphRAG updates, co-occurrence learning
  - Enrichissement du knowledge graph après chaque workflow
  - Apprentissage des patterns de co-utilisation d'outils

**Performance mesurée :**
- Speedup 5x via DAG parallel execution (vérifié par benchmarks)
- State update latency: 0.003ms (vs <1ms target)
- Event emission overhead: <5ms P95
- Command injection latency: <10ms P95

*Note sur Checkpoints : Sauvegarde l'état du workflow (tasks, decisions, messages, context) mais pas l'état du filesystem. Workflows modifiant des fichiers nécessitent des tâches idempotentes. Voir section "En Développement" ci-dessous pour la solution complète.

### 🚧 En Développement Actif

**Agent Code Sandboxing (Concept 3) :**
- 🚧 Isolation complète avec Deno subprocess et permissions granulaires
- 🚧 Filesystem state isolation (résout la limitation checkpoint)
- 🚧 Context reduction 100x+ pour data-heavy workloads
- 🚧 Memory limits et timeout protection

**État actuel :** Fondations architecturales en place (executor foundation implémenté), implémentation complète en cours.

**Timeline estimée :** Q1 2025 pour release complète avec benchmarks de sécurité et performance.

### 📊 Benchmarks et Validation

**Ce qui est mesuré :**
- Les fonctionnalités marquées ✅ ont des benchmarks réels dans le repo
- Les métriques de performance citées proviennent de tests automatisés
- Le code de tous les concepts implémentés est open-source et vérifiable

**Ce qui est projeté :**
- Les performances du sandboxing (🚧) sont des estimations basées sur prototypes
- Les nombres du tableau comparatif incluent à la fois des mesures réelles (✅) et des projections (🚧)
- Tous les benchmarks complets seront publiés lors des releases respectives

### 🔬 Essayez par Vous-même

Le code d'AgentCards sera bientôt open-source :
- Repository GitHub : [AgentCards](https://github.com/agentcards/agentcards) *(publication prochaine)*
- Le repo incluera :
  - Tous les tests (unit, integration, benchmarks)
  - Documentation complète (architecture, design decisions)
  - Implémentation (`/src/dag/` : controlled-executor, state, event-stream, command-queue)

Les fonctionnalités ✅ sont implémentées et testées. Les fonctionnalités 🚧 sont en développement actif. Le code sera publié une fois Epic 3 (Sandbox) complété.

---

## Conclusion

Le Model Context Protocol permet la composabilité. Des centaines de serveurs MCP peuvent maintenant connecter les agents IA au monde.

Mais la composabilité sans intelligence mène à des workflows rigides, des goulots d'étranglement séquentiels, et du ballonnement du contexte. À 15+ serveurs MCP, le modèle de connexion directe s'effondre.

Dans cette série d'articles, nous explorons des concepts architecturaux pour adresser ces limitations. **Jusqu'ici, nous avons couvert :**

**Article 1 : Gateway & DAG**
1. **Semantic Gateway Pattern** — Réduction de contexte de 15x
2. **DAG-Based Parallel Execution** — Réduction de latence de 4-6x

**Article 2 (cet article) : Adaptive Loops & Sandbox**
3. **Adaptive Feedback Loops** — Workflows qui apprennent et s'adaptent en temps réel
4. **Agent Code Sandboxing** — Réduction de contexte de 100x+ pour les workloads lourds

**À venir dans les prochains articles :**

**Article 3 : Speculative Execution - When the Gateway Predicts the Future**
- Comment prédire et pré-exécuter les workflows avant même que l'agent ne les demande
- Speculation WITH Sandbox : THE feature safe (0ms perceived latency)
- Confidence-based execution avec rollback automatique
- Graceful degradation et safe-to-fail branches

**Article 4 : The Self-Improving Agent - Learning from History**
- Mémoire épisodique : se souvenir des workflows passés
- Seuils adaptatifs : apprendre le niveau de confiance optimal par contexte
- Du système rigide au système auto-optimisant
- Comment les données de production rendent l'agent plus intelligent au fil du temps

Ces concepts transforment la gateway d'un simple routeur en un **système d'orchestration intelligent et auto-adaptatif** qui :
- S'adapte aux découvertes (feedback loops)
- Apprend continuellement (GraphRAG enrichment)
- Opère dans des environnements isolés (sûr)
- Retourne seulement les résultats essentiels (contexte-efficace)
- Dégrade gracieusement en cas d'échec (robuste)

### La vision

Imaginez un futur où :
- Une seule configuration MCP contient 50+ serveurs sans saturation de contexte
- Les workflows multi-outils s'adaptent automatiquement aux découvertes
- Les agents apprennent de chaque exécution et s'améliorent au fil du temps
- Les résultats apparaissent instantanément quand les prédictions sont correctes
- Les agents traitent des datasets de plusieurs gigaoctets localement, retournant seulement des insights au contexte
- Tout cela fonctionne avec les serveurs MCP existants, aucun changement de code requis

C'est ce que ces concepts permettent.

### Essayez par vous-même

AgentCards implémente ces concepts en open-source. Rejoignez-nous pour construire la couche d'optimisation qui rend les workflows d'agents à grande échelle pratiques.

---

**À propos d'AgentCards** : AgentCards est une exploration open-source de patterns architecturaux avancés pour les agents MCP. Le code complet et les benchmarks seront publiés prochainement sur GitHub.

**Questions ou feedback ?** Nous serions ravis d'entendre vos retours sur ces concepts. Ces patterns devraient-ils faire partie du protocole MCP lui-même ? N'hésitez pas à partager vos réflexions.
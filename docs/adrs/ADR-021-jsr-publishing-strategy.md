# ADR-021: JSR Publishing Strategy

**Status:** Proposed
**Date:** 2025-11-25
**Context:** Publication du projet pour l'article blog Part 3

## Context

Le projet AgentCards contient :
- Code source (sandbox, MCP gateway, DAG executor, etc.)
- Documentation de gestion de projet (stories, epics, sprints)
- Configuration BMAD (workflows Claude)
- ADRs et articles de blog

**Problème :** Comment publier le code pour que les lecteurs de l'article puissent l'utiliser facilement, sans exposer les fichiers de gestion de projet internes ?

**Options considérées :**

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| GitHub seul | Simple, historique git | Clone + setup nécessaire |
| GitHub + .gitignore | Sépare public/privé | Perd versioning des fichiers internes |
| 2 repos (dev + public) | Séparation claire | Double maintenance |
| JSR (package registry) | Import 1 ligne, doc auto | Packaging nécessaire |

## Decision

**Publier sur JSR** avec une approche incrémentale :

### Phase 1 : Sandbox seul (v0.1.0)
```
jsr:@casys/mcp-gateway
```

**Exports :**
```typescript
export { DenoSandboxExecutor } from "./sandbox/executor.ts";
export type { ExecutionResult, SandboxConfig } from "./sandbox/types.ts";
```

**Usage :**
```typescript
import { DenoSandboxExecutor } from "jsr:@casys/mcp-gateway";

const sandbox = new DenoSandboxExecutor();
const result = await sandbox.execute("return 1 + 1");
```

### Phase 2 : Context Builder (v0.2.0)
Ajouter injection de contexte MCP.

### Phase 3 : Workflow Executor (v0.3.0)
Ajouter exécution DAG complète.

## Structure du Package

```
mod.ts                  # Point d'entrée JSR (racine, convention Deno)
src/
├── sandbox/
│   ├── executor.ts     # DenoSandboxExecutor
│   ├── types.ts        # Types publics
│   └── ...             # Implémentation interne
├── dag/                # Workflow executor
└── ...

deno.json               # Métadonnées JSR
```

**deno.json modifié :**
```json
{
  "name": "@casys/mcp-gateway",
  "version": "0.1.0",
  "exports": "./mod.ts",
  "publish": {
    "include": ["mod.ts", "src/", "README.md", "LICENSE"],
    "exclude": ["src/**/*_test.ts"]
  }
}
```

## Conséquences

### Positives
- **Import simple** : 1 ligne pour les utilisateurs
- **Documentation auto-générée** : JSR génère la doc depuis les types
- **Versioning sémantique** : Mises à jour contrôlées
- **Séparation propre** : Code public ≠ gestion projet interne

### Négatives
- **Maintenance** : Garder JSR et dev repo en sync
- **API publique** : Engagement de stabilité pour les exports

### Neutres
- Le repo GitHub personnel reste inchangé (dev complet avec BMAD)
- L'article pointe vers JSR pour l'usage, GitHub pour le code source

## Implémentation

1. ✅ `mod.ts` existe déjà à la racine avec les exports publics
2. Mettre à jour `deno.json` avec métadonnées JSR
3. Créer compte/scope `@casys` sur jsr.io
4. `deno publish`
5. Mettre à jour l'article avec le lien JSR

## Phase 4 : Interactive Playground (Deno Deploy)

Pour permettre aux lecteurs d'essayer le code sans installation :

**Recommandation : Deno Deploy Playground**

- Officiel Deno (cohérent avec le projet)
- Import JSR natif
- Partage via URL
- Gratuit

**Exemple de playground partageable :**
```typescript
// https://dash.deno.com/playground/casys-mcp-sandbox
import { DenoSandboxExecutor } from "jsr:@casys/mcp-gateway";

const sandbox = new DenoSandboxExecutor();

Deno.serve(async () => {
  const result = await sandbox.execute(`
    const data = [1, 2, 3, 4, 5];
    return {
      sum: data.reduce((a, b) => a + b, 0),
      avg: data.reduce((a, b) => a + b, 0) / data.length
    };
  `);

  return new Response(JSON.stringify(result, null, 2), {
    headers: { "content-type": "application/json" }
  });
});
```

**Dans l'article :**
> **Essayer en ligne :** [Deno Deploy Playground](https://dash.deno.com/playground/casys-mcp-sandbox)

## Références

- [JSR Documentation](https://jsr.io/docs)
- [Deno Publish](https://docs.deno.com/runtime/manual/advanced/publishing/)
- [Val Town](https://val.town) - TypeScript serverless avec support JSR
- Article blog Part 3 : Code Sandboxing + MCP Tools Injection

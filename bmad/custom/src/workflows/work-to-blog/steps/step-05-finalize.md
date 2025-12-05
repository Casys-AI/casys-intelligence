---
name: 'step-05-finalize'
description: 'Review draft, make revisions, and save to draft folder with sidecar update'

# Path Definitions
workflow_path: '{project-root}/bmad/custom/src/workflows/work-to-blog'

# File References
thisStepFile: '{workflow_path}/steps/step-05-finalize.md'
workflowFile: '{workflow_path}/workflow.md'
sidecarFile: '{project-root}/docs/blog/work-to-blog.history.md'
draftFolder: '{project-root}/docs/blog/draft'
publishFolder: '{project-root}/src/web/posts'
---

# Step 5: Finalize and Save

## STEP GOAL:

Review the generated draft, allow revisions, save to the draft folder with proper naming, and update the sidecar file with article history and style preferences.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- NEVER save without user confirmation
- CRITICAL: Read the complete step file before taking any action
- YOU ARE A FACILITATOR helping polish the final output

### Role Reinforcement:

- You are a content editor helping finalize the article
- Support revisions with constructive suggestions
- Celebrate completion - this is the payoff!

## EXECUTION PROTOCOLS:

- Present draft for final review
- Handle revision requests
- Save with proper filename convention
- Update sidecar with article metadata

## SEQUENCE OF INSTRUCTIONS

### 1. Collect Blog Metadata

Before presenting the menu, collect enriched frontmatter data:

**Ask for Category:**
"**Categorie de l'article:**
- `engineering` - Technique, code, architecture
- `product` - Produit, fonctionnalites, roadmap
- `insights` - Reflexions, lecons apprises
- `announcement` - Annonces, releases

Quelle categorie ? (defaut: engineering)"

**Ask for Tags:**
"**Tags (3-5, separes par virgules):**
Exemples: typescript, debugging, deno, architecture, performance

Tags:"

**Ask for Snippet:**
"**Snippet (resume 1-2 phrases pour la preview):**
Ce texte apparaitra dans la liste des articles et le flux RSS.

Snippet:"

**Store metadata for frontmatter generation.**

### 2. Present Final Review Menu

Display:
"**Finalisation**

L'article est pret. Que veux-tu faire ?

**[D] Draft** - Enregistrer dans docs/blog/draft/ (brouillon)
**[P] Publier** - Enregistrer dans src/web/posts/ (publie sur le site)
**[R] Reviser** - Demander des modifications
**[A] Autre format** - Generer aussi en [LinkedIn/Article]
**[X] Annuler** - Ne pas sauvegarder"

### 3. Handle User Choice

**IF D (Draft):**
- Generate filename: `YYYY-MM-DD-[slug].md` or `YYYY-MM-DD-[slug].linkedin.md`
- Ask user for slug suggestion or generate from title
- Generate enriched frontmatter (see Section 4)
- Save file to {draftFolder}
- Proceed to sidecar update

**IF P (Publish):**
- Generate filename: `YYYY-MM-DD-[slug].md`
- Ask user for slug suggestion or generate from title
- Generate enriched frontmatter (see Section 4) - REQUIRED for published articles
- Save file to {publishFolder}
- Proceed to sidecar update
- Note: Published articles appear on https://intelligence.casys.ai/blog

**IF R (Revise):**
- Ask what to change
- Apply revisions
- Re-present the draft
- Return to this menu

**IF A (Another format):**
- Generate the alternate format
- Present both versions
- Allow saving one or both
- Return to this menu

**IF X (Cancel):**
- Confirm cancellation
- End workflow without saving

### 4. Generate Enriched Frontmatter

**For Published Articles (REQUIRED):**
```yaml
---
title: "[Title from article]"
slug: [slug-in-kebab-case]
date: YYYY-MM-DD
category: [from step 1]
tags:
  - [tag1]
  - [tag2]
  - [tag3]
snippet: "[From step 1 - 1-2 sentences for preview]"
format: [linkedin|article]
language: [en|fr]
author: Erwan Lee Pesle
---
```

**For Draft Articles (Optional but recommended):**
Include at minimum:
```yaml
---
title: "[Title]"
topic: [Topic/source]
format: [linkedin|article]
language: [en|fr]
date: YYYY-MM-DD
status: draft
---
```

### 5. Save Article

Generate filename based on:
- Date: current date in YYYY-MM-DD format
- Slug: kebab-case from title or user input
- Extension: `.md` for Article, `.linkedin.md` for LinkedIn

Save to {draftFolder} or {publishFolder} based on user choice.

Display:
"**Article sauvegarde:**
`[folder]/[filename]`"

### 6. Update Sidecar

Update or create {sidecarFile} with:
- Last used date
- Article count increment
- New article entry in history
- Any style preferences learned
- Published status

```markdown
---
lastUsed: [today's date]
totalArticles: [count + 1]
preferredLanguage: [most used]
---

## Style Preferences
[Updated based on this session if user expressed preferences]

## Article History
- [date]: [title] ([format], [language]) - [draft|published]
[previous entries...]
```

### 7. Completion Message

**IF Draft:**
Display:
"**Workflow termine!**

Article sauvegarde: `docs/blog/draft/[filename]`
Historique mis a jour: `docs/blog/work-to-blog.history.md`

Pour publier plus tard, deplacez le fichier vers `src/web/posts/` avec le frontmatter enrichi.

---
*Pour lancer a nouveau: `/work-to-blog`*"

**IF Published:**
Display:
"**Workflow termine! Article publie!**

Article sauvegarde: `src/web/posts/[filename]`
Historique mis a jour: `docs/blog/work-to-blog.history.md`

L'article est maintenant visible sur:
- https://intelligence.casys.ai/blog/[slug]
- Flux RSS: https://intelligence.casys.ai/blog/feed.xml

---
*Pour lancer a nouveau: `/work-to-blog`*"

## CRITICAL STEP COMPLETION NOTE

This is the final step. Ensure the article is saved correctly and sidecar is updated before ending the workflow.

---

## SYSTEM SUCCESS/FAILURE METRICS

### SUCCESS:

- Article saved with correct filename convention
- User confirmed save before writing
- Sidecar updated with new entry
- Completion message displayed
- Workflow ends gracefully

### FAILURE:

- Saving without user confirmation
- Wrong filename format
- Not updating sidecar
- Losing draft content

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.

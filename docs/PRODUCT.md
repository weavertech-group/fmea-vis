# FMEA Workbench — Product Design

## 1. Product identity

**Name:** FMEA Workbench  
**One-liner:** Structure QA console for FMEA Agent responses (Requirements · DFMEA · PFMEA).

**Not:** a general diagram editor, or a full AIAG-VDA authoring suite.  
**Is:** the place platform engineers and FMEA reviewers go when the agent returns a tree — to **see, validate, fix, and re-export** it.

### Primary users

| Persona | Job to be done |
| --- | --- |
| Agent / platform engineer | Debug malformed agent JSON; confirm nets & interfaces; re-export `modifiedStructure` |
| FMEA domain reviewer | Check AIAG-VDA skeleton (system→subsystem→component, func→cha→failure); read rule findings |
| QA / eval | Score agent outputs against `rules.md`; compare samples |

### Core loop

```text
Ingest → Inspect → Validate → Edit → Export
  │         │          │         │       │
  sample  graph+     rule     local    JSON for
  paste   tree+      engine    patch    full_doc
  API     table+               nodes    round-trip
          overview
```

### Domain objects (from Agent API)

- **Structure tree** — parentId hierarchy (req / DFMEA structure / PFMEA process)
- **featureNet** — functional / characteristic linkage across levels
- **failureNet** — failure (or mode) chain linkage
- **interface** — component interactions (DFMEA)
- **extra** — severity, occurrence, detection, classification, etc.
- **Rules** — coded constraints in `rules.md` / `src/lib/fmea-rules.ts`

---

## 2. Information architecture

### Surfaces

| Surface | Purpose |
| --- | --- |
| **Landing** | Load sample / paste / API; explain product |
| **Overview strip** | Health score, node counts by type, error/warn counts, S/O/D highlights |
| **Structure graph** | Hierarchical layout (Dagre LR), primary spatial view |
| **Outline tree** | Fast navigation, expand/collapse, jump to graph selection |
| **Analysis table** | Flat FMEA rows (failure/mode chain + S/O/D/RPN when present) |
| **Feature / Failure / Interface** | Dedicated net graphs |
| **Rules** | Grouped findings; click finding → focus node |
| **Inspector** | Edit selected node / interface; apply to local model |
| **Export** | Download current JSON; copy for agent `modifiedStructure` |

### Chrome

- Dark engineering workstation (existing design system)
- Collapsible data + inspector panels
- Global search (type / description / UUID)
- Type filter chips (system, func, failure, …)

---

## 3. Feature set (this implementation)

### P0 — ship

1. Central **document model** (parsed response + type + selection + dirty flag)
2. **Overview** metrics from structure + rules
3. **Outline tree** synchronized with selection
4. **Analysis table** for DFMEA/PFMEA failure chains
5. **Search & type filter**
6. **Rule → node focus** (when details mention UUID or node context)
7. **Export / copy JSON** of current (possibly edited) document
8. **Recent sessions** in localStorage
9. Keep graph views + rule engine + samples

### P1 — later

- Diff against previous agent version (structure stability rules 00-1-0-07/08)
- Request-mode validation (scope / sessionId)
- Collaborative annotations
- Full AIAG worksheets / print layouts

---

## 4. Success metrics (product, not vanity)

- Time from paste → first rule error understood & node located: **< 30s**
- Reviewer can export a corrected structure without leaving the tool
- Zero blank screens: every empty tab explains *why* empty

---

## 5. Non-goals

- Multiplayer / accounts / cloud DB
- Running the Agent itself (optional remote fetch only)
- Replacing enterprise FMEA tools (APIS IQ, IQ-FMEA, etc.)

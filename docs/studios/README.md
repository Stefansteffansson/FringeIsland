# Studios

Full-lifecycle environments used by Dreamineers and Weavers to create, deploy, manage, and retire FringeIsland content. Studios cover the **entire lifecycle** — design, deploy, manage, retire — **not just authoring**. Each Studio writes to a specific Domain Service.

## The three studios

| Studio | Folder | Writes to | Prefix | Wave |
|--------|--------|-----------|--------|------|
| **Journey Studio** | [`journey-studio/`](./journey-studio/) | Experience Engine (DS-3) | `JS` | Eid+ |
| **Universe Studio** | [`universe-studio/`](./universe-studio/) | World Model (DS-1) | `US` | Eid+ |
| **Arc Studio** | [`arc-studio/`](./arc-studio/) | Narrative Engine (DS-2) | `AS` | Urd |

Arc Studio arrives in the **Urd** wave; Journey Studio and Universe Studio are scoped from **Eid** onward.

## Per-studio files

- `DESCRIPTION.md` — outward-facing identity (template: `../templates/studio-description.md`)
- `features/` — feature specs using the studio's prefix

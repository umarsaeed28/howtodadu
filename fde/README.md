# Pencil FDE — Feasibility Framework

A simple UI + agent that turns a **property address** into a structured
**feasibility report**, built as a forward-deployed-engineering (FDE) framework:
the core is thin and stable, and you plug in **tools** (data sources) and
**knowledge** (the RAG system) as you get them.

```
            ┌─────────── UI (address in) ───────────┐
            ▼                                        │
  FastAPI /api/feasibility                           │
            ▼                                        │
     FeasibilityAgent ──▶ Tools (geocode, parcel, knowledge_search, …)
            │                     │
            │                     └─▶ RAG knowledge base (../rag)
            ▼
   Structured FeasibilityReport ──▶ rendered in the UI
```

- Keeps the existing **RAG system** (`../rag`) fully intact — it's wired in as
  the `knowledge_search` tool.
- Runs in **mock mode** with no API key (stub tools) so the UI works today.
- Flips to **live mode** automatically when `OPENAI_API_KEY` is set.

## Layout

```
fde/
├── fde/
│   ├── config.py        # settings + path wiring to ../rag
│   ├── schema.py        # FeasibilityReport (the stable contract)
│   ├── tools/
│   │   ├── base.py      # Tool + ToolResult
│   │   ├── registry.py  # global tool registry
│   │   └── builtin.py   # geocode (stub), parcel_lookup (stub), knowledge_search (real)
│   ├── agent.py         # tool-use loop + structured synthesis + mock
│   ├── pipeline.py      # run_feasibility(address)
│   ├── api.py           # FastAPI app
│   └── cli.py           # `fde serve` / `fde feasibility "..."` / `fde tools`
├── web/index.html       # the UI (vanilla, no build step)
├── requirements.txt
└── .env.example
```

## Setup

```bash
cd fde
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env    # optional: add OPENAI_API_KEY for live mode
```

## Run

```bash
# Web UI + API (http://127.0.0.1:8000)
python -m fde serve

# One-off from the terminal
python -m fde feasibility "4214 NW 62nd St, Seattle, WA"
python -m fde feasibility "312 N 102nd St" --json

# List available tools
python -m fde tools
```

Endpoints: `GET /` (UI), `POST /api/feasibility {address}`, `GET /api/tools`,
`GET /api/health`.

## Plugging in your tools (the main extension point)

Add a capability by registering a `FunctionTool`. Do this in `fde/tools/builtin.py`
(or a new module you import). Keep the `ToolResult` shape; the agent and UI pick
it up automatically.

```python
from fde.tools import registry, FunctionTool, ToolResult

def seattle_zoning(address: str) -> ToolResult:
    data = call_your_gis_api(address)          # ← your integration
    return ToolResult(ok=True, data=data, source="Seattle GIS")

registry.register(FunctionTool(
    name="seattle_zoning",
    description="Authoritative zoning + overlays for a Seattle address.",
    parameters={
        "type": "object",
        "properties": {"address": {"type": "string"}},
        "required": ["address"],
    },
    func=seattle_zoning,
))
```

Replace the two **stubs** (`geocode`, `parcel_lookup`) with real services when
you send the links (King County / Seattle GIS, a geocoder, an MLS feed, etc.).

## Plugging in knowledge

The knowledge base is the RAG system in `../rag`:

```bash
# add your markdown to ../rag/documents/, then:
cd ../rag && source .venv/bin/activate && python -m seattle_rag ingest
```

The agent's `knowledge_search` tool queries it and cites the passages it uses.

## Modes

| Mode | When | Behavior |
| --- | --- | --- |
| `mock` | no `OPENAI_API_KEY`, or `FDE_MOCK=1` | Calls stub tools, returns a deterministic sample report. UI fully works. |
| `live` | `OPENAI_API_KEY` set | LLM tool-use loop over real tools + RAG, structured report with citations. |

## Notes

- Not legal or code advice; verify against the Seattle Municipal Code.
- `fde` and `rag` can share one venv or use separate ones; `config.py` adds
  `../rag` to `sys.path` so `import seattle_rag` works either way.

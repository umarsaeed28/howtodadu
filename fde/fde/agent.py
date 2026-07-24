"""The feasibility agent.

Two phases:
  1. Gather   — an LLM tool-use loop calls registered tools (geocode, parcel,
                knowledge_search, ...) to collect facts + cite rules.
  2. Synthesize — the model returns a structured FeasibilityReport (JSON) built
                only from what the tools returned.

If no API key is configured (or FDE_MOCK=1), `run` produces a deterministic
mock report by calling the tools directly, so the UI works end-to-end.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List

from .config import Settings
from .schema import (
    Allowance,
    BuildScenario,
    Citation,
    FeasibilityReport,
    PropertyContext,
    ToolInvocation,
)
from .tools.registry import ToolRegistry, registry as default_registry

_GATHER_SYSTEM = """You are a Seattle real-estate development feasibility analyst.
Goal: given a property address, determine what can be built there.

Use the available tools to:
- resolve the address (geocode),
- fetch parcel facts (parcel_lookup): zoning, lot size, transit proximity, overlays,
- search the knowledge base (knowledge_search) to confirm what the zoning allows
  (unit counts, HB 1110, ADU/DADU, FAR, height, setbacks, tree/ECA constraints).

Call tools until you have enough grounded facts to describe what's allowed and a
few realistic build scenarios. Prefer citing knowledge_search passages over prior
assumptions. When done gathering, stop calling tools and say "READY".
"""

_SYNTH_SYSTEM = """You convert gathered facts into a structured feasibility report.
Rules:
- Use ONLY the facts and passages gathered by the tools. Do not invent zoning
  codes, unit counts, FAR, or citations.
- Every allowance/scenario that relies on a rule should cite its source
  (the knowledge passage source/breadcrumb, or the tool name).
- If a fact is unknown, say so and lower confidence rather than guessing.
- Output MUST be a single JSON object matching the provided schema. No prose.
"""


class FeasibilityAgent:
    def __init__(self, settings: Settings, tool_registry: ToolRegistry | None = None) -> None:
        self.settings = settings
        self.registry = tool_registry or default_registry

    # ------------------------------------------------------------------ #
    # Public entry point
    # ------------------------------------------------------------------ #
    def run(self, address: str) -> FeasibilityReport:
        address = address.strip()
        if not address:
            raise ValueError("address is required")
        if self.settings.mock:
            return self._mock(address)
        return self._live(address)

    # ------------------------------------------------------------------ #
    # Live LLM path
    # ------------------------------------------------------------------ #
    def _client(self):
        from openai import OpenAI

        return OpenAI(api_key=self.settings.require_api_key())

    def _live(self, address: str) -> FeasibilityReport:
        client = self._client()
        trace: List[ToolInvocation] = []

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": _GATHER_SYSTEM},
            {"role": "user", "content": f"Property address: {address}"},
        ]
        tools = self.registry.openai_schema()

        for _ in range(self.settings.max_tool_steps):
            resp = client.chat.completions.create(
                model=self.settings.chat_model,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.1,
            )
            msg = resp.choices[0].message
            if not msg.tool_calls:
                break
            messages.append(
                {
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in msg.tool_calls
                    ],
                }
            )
            for tc in msg.tool_calls:
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                result = self.registry.run(tc.function.name, args)
                trace.append(
                    ToolInvocation(
                        tool=tc.function.name,
                        arguments=args,
                        ok=result.ok,
                        source=result.source,
                        error=result.error,
                    )
                )
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result.to_model_payload())[:12000],
                    }
                )

        report = self._synthesize(client, address, messages, trace)
        report.tool_trace = trace
        report.mode = "live"
        return report

    def _synthesize(
        self,
        client,
        address: str,
        messages: List[Dict[str, Any]],
        trace: List[ToolInvocation],
    ) -> FeasibilityReport:
        schema = FeasibilityReport.model_json_schema()
        synth_messages = [
            {"role": "system", "content": _SYNTH_SYSTEM},
            *messages[1:],  # keep the gathered context (drop the gather system prompt)
            {
                "role": "user",
                "content": (
                    f"Produce the feasibility report for: {address}\n\n"
                    f"Return JSON conforming to this JSON Schema:\n{json.dumps(schema)}"
                ),
            },
        ]
        resp = client.chat.completions.create(
            model=self.settings.chat_model,
            messages=synth_messages,
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or "{}"
        try:
            report = FeasibilityReport.model_validate_json(content)
        except Exception:
            data = json.loads(content) if content.strip().startswith("{") else {}
            report = self._coerce(address, data)
        if not report.address:
            report.address = address
        return report

    @staticmethod
    def _coerce(address: str, data: Dict[str, Any]) -> FeasibilityReport:
        """Best-effort build if the model's JSON is slightly off-schema."""
        ctx = data.get("property_context") or {"address": address}
        ctx.setdefault("address", address)
        return FeasibilityReport(
            address=data.get("address", address),
            summary=data.get("summary", "Feasibility could not be fully structured."),
            property_context=PropertyContext(**ctx),
            allowances=[Allowance(**a) for a in data.get("allowances", []) if isinstance(a, dict)],
            scenarios=[BuildScenario(**s) for s in data.get("scenarios", []) if isinstance(s, dict)],
            constraints=list(data.get("constraints", [])),
            citations=[Citation(**c) for c in data.get("citations", []) if isinstance(c, dict)],
            confidence=data.get("confidence", "low"),
            disclaimers=list(data.get("disclaimers", [])),
        )

    # ------------------------------------------------------------------ #
    # Mock path (no API key) — exercises the tools, deterministic output
    # ------------------------------------------------------------------ #
    def _mock(self, address: str) -> FeasibilityReport:
        trace: List[ToolInvocation] = []

        geo = self.registry.run("geocode", {"address": address})
        trace.append(ToolInvocation(tool="geocode", arguments={"address": address}, ok=geo.ok, source=geo.source, error=geo.error))

        par = self.registry.run("parcel_lookup", {"address": address})
        trace.append(ToolInvocation(tool="parcel_lookup", arguments={"address": address}, ok=par.ok, source=par.source, error=par.error))

        pdata = par.data if par.ok else {}
        zone = pdata.get("zone", "NR2")
        lot = pdata.get("lot_sqft")
        near_transit = bool(pdata.get("near_transit"))
        overlays = list(pdata.get("overlays", []))

        base_units = 4
        max_units = 6 if near_transit else base_units

        ctx = PropertyContext(
            address=address,
            lat=geo.data.get("lat") if geo.ok else None,
            lng=geo.data.get("lng") if geo.ok else None,
            parcel_id=pdata.get("parcel_id"),
            zone=zone,
            lot_sqft=lot,
            near_transit=near_transit,
            overlays=overlays,
            notes=["Mock mode: stub geocode/parcel data. Set OPENAI_API_KEY and real tools for live results."],
            raw={"geocode": geo.data, "parcel": pdata},
        )

        sample_cite = Citation(source="knowledge_base (sample)", detail="Middle housing overview")
        allowances = [
            Allowance(
                label=f"Up to {max_units} homes",
                detail=(
                    f"{zone} lots typically allow up to 4 homes, and up to 6 within a quarter mile "
                    f"of frequent transit. This parcel is {'near' if near_transit else 'not flagged near'} transit."
                ),
                confidence="medium",
                citations=[sample_cite],
            ),
            Allowance(
                label="DADU / backyard cottage",
                detail="A detached ADU can usually be added alongside primary units, subject to size/height limits.",
                confidence="medium",
                citations=[sample_cite],
            ),
        ]
        if overlays:
            allowances.append(
                Allowance(
                    label="Environmental constraint",
                    detail=f"Overlays present: {', '.join(overlays)}. May reduce buildable/net lot area.",
                    confidence="low",
                    citations=[],
                )
            )

        scenarios = [
            BuildScenario(
                name="Fourplex",
                units=4,
                summary="Four homes as townhomes or stacked flats within the base NR allowance.",
                key_constraints=["FAR by zone", "Height ~32 ft", "Setbacks + lot coverage"],
                citations=[sample_cite],
            ),
        ]
        if max_units >= 6:
            scenarios.append(
                BuildScenario(
                    name="Six-unit (transit)",
                    units=6,
                    summary="Six homes unlocked by frequent-transit proximity.",
                    key_constraints=["Confirm quarter-mile transit test", "Parking/design standards"],
                    citations=[sample_cite],
                )
            )
        scenarios.append(
            BuildScenario(
                name="House + DADU",
                units=2,
                summary="Keep/replace the primary house and add a detached backyard cottage.",
                key_constraints=["DADU max size/height", "Rear-yard coverage"],
                citations=[sample_cite],
            )
        )

        return FeasibilityReport(
            address=address,
            summary=(
                f"{address} appears to be zoned {zone}"
                + (f" on a ~{lot:,} sqft lot" if lot else "")
                + f". Middle housing likely supports up to {max_units} homes"
                + (" given transit proximity" if near_transit else "")
                + ". This is a mock read — plug in real tools/knowledge for authoritative results."
            ),
            property_context=ctx,
            allowances=allowances,
            scenarios=scenarios,
            constraints=[
                "Verify zoning + overlays against Seattle GIS and SMC.",
                "FAR/height/setbacks determine actual buildable area.",
            ]
            + ([f"Overlay(s): {', '.join(overlays)}"] if overlays else []),
            citations=[sample_cite],
            confidence="low",
            disclaimers=[
                "Mock output from stub tools. Not legal or code advice.",
                "Replace geocode/parcel_lookup with real integrations and ingest real knowledge.",
            ],
            tool_trace=trace,
            mode="mock",
        )

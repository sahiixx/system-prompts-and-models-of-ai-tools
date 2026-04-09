"""
Unit tests for the plan-and-build-in-real-time feature.

Covers:
- _parse_plan helper
- Agent.plan_and_build_stream() happy path
- Agent.plan_and_build_stream() with tool calls inside a step
- Agent.plan_and_build_stream() fallback when plan JSON is missing
- /plan_stream web endpoint (auth + response type)
- CLI --plan flag rendering
"""

from __future__ import annotations

import json
import os
import sys
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from agent.core.agent import Agent, AgentConfig, _parse_plan
from agent.core.memory import Memory
from agent.core.tool_registry import ToolRegistry, ToolSpec
from agent.models.base import ModelMessage, ModelProvider


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _FakeModel(ModelProvider):
    """Deterministic model whose stream responses are supplied up-front."""

    def __init__(self, *response_sequences):
        """Each positional arg is an iterable of chunk dicts for one call."""
        super().__init__(name="fake")
        self._sequences = list(response_sequences)
        self._idx = 0

    def complete(self, messages, tools=None):
        chunks = list(self._next_sequence())
        for c in reversed(chunks):
            if c.get("done"):
                return c
        return {"content": "", "tool_calls": []}

    def stream_complete(self, messages, tools=None):
        yield from self._next_sequence()

    def _next_sequence(self):
        if self._idx < len(self._sequences):
            seq = self._sequences[self._idx]
            self._idx += 1
            return seq
        return [{"delta": "", "done": True, "content": "", "tool_calls": []}]


def _plan_json(goal="Do something", steps=None):
    steps = steps or [
        {"id": 1, "description": "First step"},
        {"id": 2, "description": "Second step"},
    ]
    return json.dumps({"goal": goal, "steps": steps})


# ---------------------------------------------------------------------------
# _parse_plan
# ---------------------------------------------------------------------------

class TestParsePlan(unittest.TestCase):

    def test_parses_valid_json(self):
        text = _plan_json("Test goal", [{"id": 1, "description": "Do it"}])
        steps, goal = _parse_plan(text, "fallback")
        self.assertEqual(goal, "Test goal")
        self.assertEqual(len(steps), 1)
        self.assertEqual(steps[0]["description"], "Do it")

    def test_extracts_json_embedded_in_prose(self):
        text = "Sure! Here is the plan: " + _plan_json() + " Let me know."
        steps, goal = _parse_plan(text, "fallback")
        self.assertEqual(len(steps), 2)

    def test_fallback_on_invalid_json(self):
        steps, goal = _parse_plan("not json at all", "my task")
        self.assertEqual(goal, "my task")
        self.assertEqual(len(steps), 1)
        self.assertEqual(steps[0]["description"], "my task")

    def test_fallback_on_empty_steps(self):
        text = json.dumps({"goal": "G", "steps": []})
        steps, goal = _parse_plan(text, "fallback task")
        self.assertEqual(len(steps), 1)
        self.assertEqual(steps[0]["description"], "fallback task")

    def test_uses_fallback_goal_when_missing(self):
        text = json.dumps({"steps": [{"id": 1, "description": "x"}]})
        steps, goal = _parse_plan(text, "orig task")
        self.assertEqual(goal, "orig task")
        self.assertEqual(len(steps), 1)


# ---------------------------------------------------------------------------
# Agent.plan_and_build_stream – happy path
# ---------------------------------------------------------------------------

class TestPlanAndBuildStream(unittest.TestCase):

    def _make_agent(self, *sequences):
        model = _FakeModel(*sequences)
        registry = ToolRegistry()
        memory = Memory()
        config = AgentConfig(system_prompt="Be helpful.")
        return Agent(model=model, tools=registry, memory=memory, config=config)

    def _collect(self, agent, msg):
        return list(agent.plan_and_build_stream(msg))

    # --- event shape --------------------------------------------------------

    def test_emits_planning_deltas(self):
        plan_seq = [
            {"delta": _plan_json(), "done": True, "content": _plan_json(), "tool_calls": []},
        ]
        step_seq = [
            {"delta": "done", "done": True, "content": "done", "tool_calls": []},
            {"delta": "done2", "done": True, "content": "done2", "tool_calls": []},
        ]
        agent = self._make_agent(plan_seq, step_seq, step_seq)
        events = self._collect(agent, "do stuff")
        planning = [e for e in events if e.get("event") == "planning"]
        self.assertTrue(len(planning) >= 1)

    def test_emits_plan_event(self):
        plan_text = _plan_json("My goal", [{"id": 1, "description": "Step A"}])
        plan_seq = [{"delta": plan_text, "done": True, "content": plan_text, "tool_calls": []}]
        step_seq = [{"delta": "ok", "done": True, "content": "ok", "tool_calls": []}]
        agent = self._make_agent(plan_seq, step_seq)
        events = self._collect(agent, "do stuff")
        plan_events = [e for e in events if e.get("event") == "plan"]
        self.assertEqual(len(plan_events), 1)
        self.assertEqual(plan_events[0]["goal"], "My goal")
        self.assertEqual(len(plan_events[0]["steps"]), 1)

    def test_emits_step_start_and_done(self):
        plan_text = _plan_json(steps=[{"id": 1, "description": "S1"}, {"id": 2, "description": "S2"}])
        plan_seq = [{"delta": plan_text, "done": True, "content": plan_text, "tool_calls": []}]
        step1_seq = [{"delta": "r1", "done": True, "content": "r1", "tool_calls": []}]
        step2_seq = [{"delta": "r2", "done": True, "content": "r2", "tool_calls": []}]
        agent = self._make_agent(plan_seq, step1_seq, step2_seq)
        events = self._collect(agent, "task")

        starts = [e for e in events if e.get("event") == "step_start"]
        dones = [e for e in events if e.get("event") == "step_done"]
        self.assertEqual(len(starts), 2)
        self.assertEqual(len(dones), 2)
        self.assertEqual(starts[0]["step"], 1)
        self.assertEqual(starts[1]["step"], 2)

    def test_emits_step_progress(self):
        plan_text = _plan_json(steps=[{"id": 1, "description": "S1"}])
        plan_seq = [{"delta": plan_text, "done": True, "content": plan_text, "tool_calls": []}]
        step_seq = [
            {"delta": "Hello"},
            {"delta": " world", "done": True, "content": "Hello world", "tool_calls": []},
        ]
        agent = self._make_agent(plan_seq, step_seq)
        events = self._collect(agent, "task")
        progress = [e for e in events if e.get("event") == "step_progress"]
        self.assertGreater(len(progress), 0)
        deltas = "".join(e["delta"] for e in progress)
        self.assertIn("Hello", deltas)

    def test_emits_done_at_end(self):
        plan_text = _plan_json(steps=[{"id": 1, "description": "S1"}])
        plan_seq = [{"delta": plan_text, "done": True, "content": plan_text, "tool_calls": []}]
        step_seq = [{"delta": "ok", "done": True, "content": "ok", "tool_calls": []}]
        agent = self._make_agent(plan_seq, step_seq)
        events = self._collect(agent, "task")
        done_events = [e for e in events if e.get("event") == "done"]
        self.assertEqual(len(done_events), 1)

    # --- memory / system prompt ---------------------------------------------

    def test_system_prompt_added_once(self):
        plan_text = _plan_json(steps=[{"id": 1, "description": "S1"}])
        plan_seq = [{"delta": plan_text, "done": True, "content": plan_text, "tool_calls": []}]
        step_seq = [{"delta": "ok", "done": True, "content": "ok", "tool_calls": []}]
        agent = self._make_agent(plan_seq, step_seq)
        self._collect(agent, "task")
        system_msgs = [m for m in agent.memory.as_list() if m["role"] == "system"]
        self.assertEqual(len(system_msgs), 1)

    # --- fallback when model returns no valid JSON --------------------------

    def test_fallback_single_step_on_bad_plan(self):
        plan_seq = [{"delta": "no json here", "done": True, "content": "no json here", "tool_calls": []}]
        step_seq = [{"delta": "ok", "done": True, "content": "ok", "tool_calls": []}]
        agent = self._make_agent(plan_seq, step_seq)
        events = self._collect(agent, "my task")
        plan_events = [e for e in events if e.get("event") == "plan"]
        self.assertEqual(len(plan_events[0]["steps"]), 1)
        self.assertEqual(plan_events[0]["steps"][0]["description"], "my task")


# ---------------------------------------------------------------------------
# Agent.plan_and_build_stream – tool calls within a step
# ---------------------------------------------------------------------------

class TestPlanAndBuildStreamWithTools(unittest.TestCase):

    def test_tool_results_emitted_per_step(self):
        plan_text = _plan_json(steps=[{"id": 1, "description": "Run tool"}])
        plan_seq = [{"delta": plan_text, "done": True, "content": plan_text, "tool_calls": []}]
        # First step response triggers a tool call
        step_with_tool = [
            {
                "delta": "",
                "done": True,
                "content": "",
                "tool_calls": [{"name": "math.calc", "arguments": {"expression": "1+1"}}],
            }
        ]
        # After tool result, model produces final answer
        after_tool = [{"delta": "2", "done": True, "content": "2", "tool_calls": []}]

        model = _FakeModel(plan_seq, step_with_tool, after_tool)
        registry = ToolRegistry()
        # Register a simple tool
        registry.register(ToolSpec(
            name="math.calc",
            description="Math",
            fn=lambda args: {"result": int(args.get("expression", "0").replace("1+1", "2"))},
        ))
        agent = Agent(model=model, tools=registry, memory=Memory(), config=AgentConfig())
        events = list(agent.plan_and_build_stream("calculate 1+1"))

        tool_events = [e for e in events if e.get("event") == "tool_result"]
        self.assertEqual(len(tool_events), 1)
        self.assertEqual(tool_events[0]["name"], "math.calc")
        self.assertEqual(tool_events[0]["step"], 1)


# ---------------------------------------------------------------------------
# Web endpoint: /plan_stream
# ---------------------------------------------------------------------------

class TestPlanStreamEndpoint(unittest.IsolatedAsyncioTestCase):

    def test_plan_stream_route_exists(self):
        from agent.runtime.web import app
        routes = {r.path for r in app.routes}
        self.assertIn("/plan_stream", routes)

    @patch("agent.runtime.web.build_agent")
    @patch.dict(os.environ, {}, clear=True)
    async def test_plan_stream_returns_event_source_response(self, mock_build_agent):
        from agent.runtime.web import plan_stream
        from sse_starlette.sse import EventSourceResponse

        mock_agent = Mock()
        mock_agent.plan_and_build_stream.return_value = iter([
            {"event": "plan", "goal": "g", "steps": []},
            {"event": "done"},
        ])
        mock_build_agent.return_value = mock_agent

        response = await plan_stream(provider="echo", model=None, q="test", x_api_key=None)
        self.assertIsInstance(response, EventSourceResponse)

    @patch("agent.runtime.web.build_agent")
    @patch.dict(os.environ, {"AGENT_API_KEY": "secret"})
    async def test_plan_stream_rejects_bad_api_key(self, _mock_build_agent):
        from agent.runtime.web import plan_stream
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as ctx:
            await plan_stream(provider="echo", model=None, q="test", x_api_key="wrong")
        self.assertEqual(ctx.exception.status_code, 401)

    @patch("agent.runtime.web.build_agent")
    @patch.dict(os.environ, {"AGENT_API_KEY": "secret"})
    async def test_plan_stream_accepts_correct_api_key(self, mock_build_agent):
        from agent.runtime.web import plan_stream

        mock_agent = Mock()
        mock_agent.plan_and_build_stream.return_value = iter([{"event": "done"}])
        mock_build_agent.return_value = mock_agent

        response = await plan_stream(provider="echo", model=None, q="test", x_api_key="secret")
        self.assertIsNotNone(response)


# ---------------------------------------------------------------------------
# CLI --plan flag
# ---------------------------------------------------------------------------

class TestCLIPlanFlag(unittest.TestCase):

    def _run_cli(self, argv, stream_events):
        """Invoke CLI main() with patched sys.argv and a fake plan_and_build_stream."""
        import io
        from contextlib import redirect_stdout
        import agent.cli as cli_module

        fake_agent = Mock()
        fake_agent.memory = Memory()
        fake_agent.plan_and_build_stream.return_value = iter(stream_events)

        buf = io.StringIO()
        with patch.object(sys, "argv", argv), \
             patch.object(cli_module, "build_agent", return_value=fake_agent), \
             redirect_stdout(buf):
            cli_module.main()
        return buf.getvalue()

    def test_plan_flag_renders_plan(self):
        events = [
            {"event": "plan", "goal": "g", "steps": [{"id": 1, "description": "Step one"}]},
            {"event": "step_start", "step": 1, "description": "Step one"},
            {"event": "step_progress", "step": 1, "delta": "Result"},
            {"event": "step_done", "step": 1, "content": "Result"},
            {"event": "done"},
        ]
        out = self._run_cli(
            ["execute-agent", "--provider", "echo", "--plan", "do something"],
            events,
        )
        self.assertIn("Step one", out)
        self.assertIn("Done.", out)

    def test_plan_flag_renders_tool_results(self):
        events = [
            {"event": "plan", "goal": "g", "steps": [{"id": 1, "description": "S"}]},
            {"event": "step_start", "step": 1, "description": "S"},
            {"event": "tool_result", "step": 1, "name": "shell", "result": {"stdout": "hi"}},
            {"event": "step_done", "step": 1, "content": ""},
            {"event": "done"},
        ]
        out = self._run_cli(
            ["execute-agent", "--provider", "echo", "--plan", "run shell"],
            events,
        )
        self.assertIn("shell", out)


if __name__ == "__main__":
    unittest.main()

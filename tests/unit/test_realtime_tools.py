"""
Comprehensive Unit Tests for agent/tools/realtime.py
Tests RealtimeTools: HuggingFace and arXiv API integration
"""

import unittest
import sys
import os
import json
from unittest.mock import patch, Mock, MagicMock

# Add agent module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from agent.core.tool_registry import ToolRegistry
from agent.tools.realtime import RealtimeTools


class TestRealtimeToolsRegistration(unittest.TestCase):
    """Test suite for RealtimeTools registration"""

    def setUp(self):
        self.registry = ToolRegistry()
        RealtimeTools(self.registry).register_all()

    def test_all_tools_registered(self):
        """Test that all 3 tools are registered correctly"""
        specs = self.registry.list_specs()
        names = [s["name"] for s in specs]

        expected = [
            "huggingface.search_models",
            "huggingface.model_info",
            "arxiv.search",
        ]
        for name in expected:
            self.assertIn(name, names)

    def test_tool_count(self):
        """Test the correct number of tools are registered"""
        specs = self.registry.list_specs()
        self.assertEqual(len(specs), 3)

    def test_tools_have_descriptions(self):
        """Test all tools have non-empty descriptions"""
        specs = self.registry.list_specs()
        for spec in specs:
            self.assertTrue(spec["description"], f"Tool {spec['name']} has no description")

    def test_tools_are_parallel_safe(self):
        """Test that all tools are marked as parallel safe"""
        specs = self.registry.list_specs()
        for spec in specs:
            self.assertTrue(spec["parallel_safe"], f"Tool {spec['name']} is not parallel safe")


class TestHuggingFaceSearchModels(unittest.TestCase):
    """Test suite for huggingface.search_models tool"""

    def setUp(self):
        self.registry = ToolRegistry()
        RealtimeTools(self.registry).register_all()

    @patch('agent.tools.realtime.urllib.request.urlopen')
    def test_search_returns_model_list(self, mock_urlopen):
        """Test that search returns a list of models"""
        mock_response_data = json.dumps([
            {
                "id": "bert-base-uncased",
                "author": "google",
                "downloads": 10000,
                "likes": 500,
                "tags": ["pytorch", "bert"],
                "pipeline_tag": "fill-mask",
                "lastModified": "2024-01-01",
            },
            {
                "id": "gpt2",
                "author": "openai",
                "downloads": 5000,
                "likes": 300,
                "tags": ["pytorch", "gpt2"],
                "pipeline_tag": "text-generation",
                "lastModified": "2024-02-01",
            },
        ]).encode("utf-8")

        mock_resp = MagicMock()
        mock_resp.read.return_value = mock_response_data
        mock_resp.__enter__ = Mock(return_value=mock_resp)
        mock_resp.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = mock_resp

        result = self.registry.call("huggingface.search_models", {
            "query": "bert",
            "limit": 5,
        })

        self.assertIn("models", result)
        models = result["models"]
        self.assertEqual(len(models), 2)
        self.assertEqual(models[0]["id"], "bert-base-uncased")
        self.assertEqual(models[0]["author"], "google")
        self.assertEqual(models[0]["downloads"], 10000)
        self.assertEqual(models[0]["likes"], 500)
        self.assertEqual(models[0]["pipeline_tag"], "fill-mask")

    @patch('agent.tools.realtime.urllib.request.urlopen')
    def test_search_error_handling(self, mock_urlopen):
        """Test error handling when HuggingFace API fails"""
        mock_urlopen.side_effect = Exception("Connection timeout")

        result = self.registry.call("huggingface.search_models", {
            "query": "bert",
        })

        self.assertIn("error", result)
        self.assertIn("HuggingFace API request failed", result["error"])

    def test_search_empty_query_error(self):
        """Test that empty query returns an error"""
        result = self.registry.call("huggingface.search_models", {
            "query": "",
        })

        self.assertIn("error", result)
        self.assertIn("query is required", result["error"])

    @patch('agent.tools.realtime.urllib.request.urlopen')
    def test_search_empty_response(self, mock_urlopen):
        """Test handling of empty response from API"""
        mock_response_data = json.dumps([]).encode("utf-8")

        mock_resp = MagicMock()
        mock_resp.read.return_value = mock_response_data
        mock_resp.__enter__ = Mock(return_value=mock_resp)
        mock_resp.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = mock_resp

        result = self.registry.call("huggingface.search_models", {
            "query": "nonexistent_model_xyz",
        })

        self.assertIn("models", result)
        self.assertEqual(result["models"], [])


class TestHuggingFaceModelInfo(unittest.TestCase):
    """Test suite for huggingface.model_info tool"""

    def setUp(self):
        self.registry = ToolRegistry()
        RealtimeTools(self.registry).register_all()

    @patch('agent.tools.realtime.urllib.request.urlopen')
    def test_model_info_returns_details(self, mock_urlopen):
        """Test that model info returns model details"""
        model_data = {
            "id": "bert-base-uncased",
            "author": "google",
            "downloads": 50000,
            "pipeline_tag": "fill-mask",
            "tags": ["pytorch", "transformers"],
            "modelId": "bert-base-uncased",
        }
        mock_response_data = json.dumps(model_data).encode("utf-8")

        mock_resp = MagicMock()
        mock_resp.read.return_value = mock_response_data
        mock_resp.__enter__ = Mock(return_value=mock_resp)
        mock_resp.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = mock_resp

        result = self.registry.call("huggingface.model_info", {
            "model_id": "bert-base-uncased",
        })

        self.assertIn("model", result)
        self.assertEqual(result["model"]["id"], "bert-base-uncased")
        self.assertEqual(result["model"]["author"], "google")

    @patch('agent.tools.realtime.urllib.request.urlopen')
    def test_model_info_not_found(self, mock_urlopen):
        """Test error handling for non-existent model"""
        mock_urlopen.side_effect = Exception("404 Not Found")

        result = self.registry.call("huggingface.model_info", {
            "model_id": "nonexistent/model",
        })

        self.assertIn("error", result)
        self.assertIn("HuggingFace API request failed", result["error"])

    def test_model_info_empty_id_error(self):
        """Test that empty model_id returns an error"""
        result = self.registry.call("huggingface.model_info", {
            "model_id": "",
        })

        self.assertIn("error", result)
        self.assertIn("model_id is required", result["error"])


class TestArxivSearch(unittest.TestCase):
    """Test suite for arxiv.search tool"""

    def setUp(self):
        self.registry = ToolRegistry()
        RealtimeTools(self.registry).register_all()

    @patch('agent.tools.realtime.urllib.request.urlopen')
    def test_arxiv_search_returns_papers(self, mock_urlopen):
        """Test that arXiv search returns parsed papers"""
        arxiv_xml = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.00001v1</id>
    <title>Attention Is All You Need</title>
    <summary>We propose a new architecture based on attention mechanisms.</summary>
    <published>2023-01-01T00:00:00Z</published>
    <author>
      <name>Vaswani</name>
    </author>
    <author>
      <name>Shazeer</name>
    </author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2301.00002v1</id>
    <title>BERT: Pre-training</title>
    <summary>We introduce BERT for language understanding.</summary>
    <published>2023-02-01T00:00:00Z</published>
    <author>
      <name>Devlin</name>
    </author>
  </entry>
</feed>"""
        mock_resp = MagicMock()
        mock_resp.read.return_value = arxiv_xml.encode("utf-8")
        mock_resp.__enter__ = Mock(return_value=mock_resp)
        mock_resp.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = mock_resp

        result = self.registry.call("arxiv.search", {
            "query": "attention",
            "max_results": 5,
        })

        self.assertIn("papers", result)
        papers = result["papers"]
        self.assertEqual(len(papers), 2)

        self.assertEqual(papers[0]["title"], "Attention Is All You Need")
        self.assertEqual(papers[0]["authors"], ["Vaswani", "Shazeer"])
        self.assertIn("attention mechanisms", papers[0]["summary"])
        self.assertEqual(papers[0]["published"], "2023-01-01T00:00:00Z")
        self.assertEqual(papers[0]["link"], "http://arxiv.org/abs/2301.00001v1")

        self.assertEqual(papers[1]["title"], "BERT: Pre-training")
        self.assertEqual(papers[1]["authors"], ["Devlin"])

    @patch('agent.tools.realtime.urllib.request.urlopen')
    def test_arxiv_search_error_handling(self, mock_urlopen):
        """Test error handling when arXiv API fails"""
        mock_urlopen.side_effect = Exception("Network error")

        result = self.registry.call("arxiv.search", {
            "query": "transformers",
        })

        self.assertIn("error", result)
        self.assertIn("arXiv API request failed", result["error"])

    def test_arxiv_search_empty_query_error(self):
        """Test that empty query returns an error"""
        result = self.registry.call("arxiv.search", {
            "query": "",
        })

        self.assertIn("error", result)
        self.assertIn("query is required", result["error"])

    @patch('agent.tools.realtime.urllib.request.urlopen')
    def test_arxiv_search_empty_results(self, mock_urlopen):
        """Test handling of empty results from arXiv"""
        arxiv_xml = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
</feed>"""
        mock_resp = MagicMock()
        mock_resp.read.return_value = arxiv_xml.encode("utf-8")
        mock_resp.__enter__ = Mock(return_value=mock_resp)
        mock_resp.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = mock_resp

        result = self.registry.call("arxiv.search", {
            "query": "nonexistent_topic",
        })

        self.assertIn("papers", result)
        self.assertEqual(result["papers"], [])

    @patch('agent.tools.realtime.urllib.request.urlopen')
    def test_arxiv_search_malformed_xml(self, mock_urlopen):
        """Test handling of malformed XML response"""
        mock_resp = MagicMock()
        mock_resp.read.return_value = b"not valid xml <<<"
        mock_resp.__enter__ = Mock(return_value=mock_resp)
        mock_resp.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = mock_resp

        result = self.registry.call("arxiv.search", {
            "query": "test",
        })

        self.assertIn("error", result)
        self.assertIn("failed to parse arXiv XML", result["error"])


if __name__ == '__main__':
    unittest.main()

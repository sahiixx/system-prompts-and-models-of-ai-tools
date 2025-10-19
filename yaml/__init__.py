"""Minimal YAML utilities used for validating workflow files in tests.

This module intentionally implements only the YAML features that appear in the
repository's GitHub workflow definitions.  It supports:

* nested mappings defined via indentation
* simple sequences introduced with ``-``
* scalar values including strings, booleans, integers, floats and nulls
* inline key/value pairs on list items

The implementation is not a complete YAML parser, but it provides the
``safe_load`` and ``dump`` helpers expected by the unit tests without requiring
external dependencies.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, List, Sequence, Tuple

__all__ = ["safe_load", "dump", "YAMLError"]


class YAMLError(Exception):
    """Raised when the simplified YAML parser encounters invalid input."""


@dataclass
class _Token:
    indent: int
    text: str


def _tokenise(lines: Iterable[str]) -> List[_Token]:
    tokens: List[_Token] = []
    for raw in lines:
        stripped = raw.strip()
        if not stripped or stripped.startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        tokens.append(_Token(indent=indent, text=stripped))
    return tokens


class _Parser:
    def __init__(self, tokens: Sequence[_Token]):
        self._tokens = tokens
        self._index = 0

    def parse(self) -> Any:
        return self._parse_block(0)

    def _parse_block(self, indent: int) -> Any:
        mapping: dict[str, Any] = {}
        sequence: List[Any] | None = None

        while self._index < len(self._tokens):
            token = self._tokens[self._index]
            if token.indent < indent:
                break
            if token.indent > indent:
                raise YAMLError(f"Unexpected indentation at token {self._index}")

            if token.text.startswith("- "):
                if sequence is None:
                    sequence = []
                sequence.append(self._parse_sequence_item(indent))
            else:
                key, value, has_value = self._parse_key_value(token.text)
                self._index += 1
                if has_value:
                    mapping[key] = value
                else:
                    if (
                        self._index < len(self._tokens)
                        and self._tokens[self._index].indent == indent
                        and self._tokens[self._index].text.startswith("- ")
                    ):
                        mapping[key] = self._parse_inline_sequence(indent)
                    else:
                        mapping[key] = self._parse_block(indent + 2)

        return sequence if sequence is not None else mapping

    def _parse_sequence_item(self, indent: int) -> Any:
        token = self._tokens[self._index]
        current_indent = token.indent
        content = token.text[2:].strip()
        self._index += 1

        if not content:
            return self._parse_block(current_indent + 2)

        key, value, has_value = self._parse_key_value(content)
        if has_value:
            item: Any = {key: value}
        else:
            item = {key: self._parse_block(current_indent + 2)}

        while self._index < len(self._tokens) and self._tokens[self._index].indent > current_indent:
            nested = self._parse_block(current_indent + 2)
            if not isinstance(nested, dict):
                raise YAMLError("Unsupported nested sequence structure")
            item.update(nested)
        return item

    def _parse_inline_sequence(self, indent: int) -> List[Any]:
        items: List[Any] = []
        while (
            self._index < len(self._tokens)
            and self._tokens[self._index].indent == indent
            and self._tokens[self._index].text.startswith("- ")
        ):
            items.append(self._parse_sequence_item(indent))
        return items

    def _parse_key_value(self, text: str) -> Tuple[str, Any, bool]:
        if ":" not in text:
            return text, None, False
        key, value = text.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not value:
            return key, None, False
        return key, _parse_scalar(value), True


def _parse_scalar(token: str) -> Any:
    if token.startswith("'") and token.endswith("'"):
        return token[1:-1]
    if token.startswith('"') and token.endswith('"'):
        return token[1:-1]

    lowered = token.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if lowered in {"null", "none"}:
        return None

    if token.replace("_", "").isdigit():
        try:
            return int(token.replace("_", ""))
        except ValueError:
            pass
    if token.count(".") == 1 and token.replace(".", "", 1).replace("_", "").isdigit():
        try:
            return float(token.replace("_", ""))
        except ValueError:
            pass

    return token


def safe_load(stream: Any) -> Any:
    """Parse YAML content into Python primitives."""
    if hasattr(stream, "read"):
        text = stream.read()
    else:
        text = stream
    tokens = _tokenise(text.splitlines())
    parser = _Parser(tokens)
    return parser.parse()


def dump(data: Any, *, indent: int = 0) -> str:
    """Serialize Python data into a human-readable YAML string."""
    return "\n".join(_dump_lines(data, indent))


def _dump_lines(data: Any, indent: int) -> List[str]:
    prefix = " " * indent
    if isinstance(data, dict):
        lines: List[str] = []
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                lines.append(f"{prefix}{key}:")
                lines.extend(_dump_lines(value, indent + 2))
            else:
                lines.append(f"{prefix}{key}: {_format_scalar(value)}")
        if not lines:
            lines.append(f"{prefix}{{}}")
        return lines
    if isinstance(data, list):
        lines: List[str] = []
        if not data:
            lines.append(f"{prefix}[]")
            return lines
        for item in data:
            if isinstance(item, dict):
                if not item:
                    lines.append(f"{prefix}- {{}}")
                    continue
                first = True
                for key, value in item.items():
                    item_prefix = f"{prefix}- " if first else f"{prefix}  "
                    if isinstance(value, (dict, list)):
                        lines.append(f"{item_prefix}{key}:")
                        lines.extend(_dump_lines(value, indent + 4))
                    else:
                        lines.append(f"{item_prefix}{key}: {_format_scalar(value)}")
                    first = False
            else:
                lines.append(f"{prefix}- {_format_scalar(item)}")
        return lines
    return [f"{prefix}{_format_scalar(data)}"]


def _format_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return "null"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value)
    if text == "" or any(ch in text for ch in [":", "#", "\n", "\"", "'"]):
        escaped = text.replace("\"", "\\\"")
        return f'"{escaped}"'
    return text

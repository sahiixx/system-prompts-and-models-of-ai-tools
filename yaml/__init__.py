"""Minimal YAML utilities used for testing without external dependencies."""

from __future__ import annotations

import ast
import json
from dataclasses import dataclass
from typing import Any, Iterable, List, Sequence

__all__ = ["safe_load", "dump", "YAMLError", "_tokenise", "_parse_scalar"]


class YAMLError(ValueError):
    """Raised when the minimal YAML parser encounters invalid input."""


@dataclass
class _Line:
    indent: int
    text: str


def _strip_comments(text: str) -> str:
    """Remove YAML comments while respecting quoted strings."""

    in_single = False
    in_double = False
    result: List[str] = []

    for char in text:
        if char == "'" and not in_double:
            in_single = not in_single
        elif char == '"' and not in_single:
            in_double = not in_double
        if char == "#" and not in_single and not in_double:
            break
        result.append(char)

    return "".join(result)


def _tokenise(lines: Iterable[str]) -> List[_Line]:
    """Convert raw YAML lines into token objects with indentation metadata."""

    tokens: List[_Line] = []
    for raw in lines:
        cleaned = _strip_comments(raw.rstrip("\n"))
        if not cleaned.strip():
            continue
        indent = len(cleaned) - len(cleaned.lstrip(" "))
        tokens.append(_Line(indent=indent, text=cleaned.strip()))
    return tokens


def _parse_scalar(value: str) -> Any:
    """Parse a scalar value from YAML into a Python object."""

    if value == "":
        return ""

    lowered = value.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if lowered in {"null", "none"}:
        return None

    if value.startswith("-"):
        # Treat negative numbers as plain strings to match the documented quirks
        return value

    normalized = value.replace("_", "")

    if normalized.isdigit():
        return int(normalized)

    if "." in normalized:
        head, _, tail = normalized.partition(".")
        if head.isdigit() and tail.isdigit():
            try:
                return float(normalized)
            except ValueError:
                pass

    if (value.startswith("'") and value.endswith("'")) or (
        value.startswith('"') and value.endswith('"')
    ):
        return ast.literal_eval(value)

    return value


class _Parser:
    def __init__(self, tokens: Sequence[_Line]):
        self._tokens = tokens
        self._index = 0

    def _peek(self) -> _Line | None:
        if self._index >= len(self._tokens):
            return None
        return self._tokens[self._index]

    def _advance(self) -> _Line:
        if self._index >= len(self._tokens):
            raise YAMLError("Unexpected end of YAML input")
        token = self._tokens[self._index]
        self._index += 1
        return token

    def parse_block(self, indent: int) -> Any:
        container_type: str | None = None
        mapping: dict[str, Any] = {}
        sequence: List[Any] = []

        while True:
            token = self._peek()
            if token is None or token.indent < indent:
                break
            if token.indent > indent and container_type is None:
                raise YAMLError("Invalid indentation")

            if token.text.startswith("- "):
                if container_type is None:
                    container_type = "list"
                elif container_type != "list":
                    break
                sequence.append(self._parse_sequence_item(indent))
            else:
                if container_type is None:
                    container_type = "dict"
                elif container_type != "dict":
                    break
                key, value = self._parse_mapping_entry(indent)
                mapping[key] = value

        if container_type is None:
            return {}
        return sequence if container_type == "list" else mapping

    def _parse_mapping_entry(self, indent: int) -> tuple[str, Any]:
        token = self._advance()
        if token.indent != indent or token.text.startswith("- "):
            raise YAMLError("Expected mapping entry")

        if ":" not in token.text:
            return token.text, {}

        key_part, value_part = token.text.split(":", 1)
        key = key_part.strip()
        value_text = value_part.strip()

        if not value_text:
            child = self._parse_child(indent)
            return key, child

        value = _parse_scalar(value_text)
        return key, value

    def _parse_sequence_item(self, indent: int) -> Any:
        token = self._advance()
        if token.indent != indent or not token.text.startswith("- "):
            raise YAMLError("Expected sequence entry")

        item_text = token.text[2:].strip()

        if not item_text:
            return self._parse_child(indent)

        if ":" not in item_text:
            return {item_text: {}}

        key_part, value_part = item_text.split(":", 1)
        key = key_part.strip()
        value_text = value_part.strip()
        item: dict[str, Any] = {}

        if value_text:
            item[key] = _parse_scalar(value_text)
        else:
            item[key] = self._parse_child(indent)

        while True:
            next_token = self._peek()
            if next_token is None or next_token.indent <= indent:
                break
            if next_token.indent == indent and next_token.text.startswith("- "):
                break
            nested = self.parse_block(next_token.indent)
            if not isinstance(nested, dict):
                raise YAMLError("List items expect mappings in nested blocks")
            item.update(nested)

        return item

    def _parse_child(self, parent_indent: int) -> Any:
        next_token = self._peek()
        if next_token is None or next_token.indent <= parent_indent:
            return {}
        return self.parse_block(next_token.indent)


def safe_load(stream: Iterable[str] | str) -> Any:
    """Parse YAML content into Python structures."""

    if hasattr(stream, "read"):
        text = stream.read()
    elif isinstance(stream, str):
        text = stream
    else:
        text = "".join(stream)

    tokens = _tokenise(text.splitlines())
    if not tokens:
        return {}

    parser = _Parser(tokens)
    return parser.parse_block(tokens[0].indent)


def dump(data: Any, indent: int = 2) -> str:
    """Serialize Python data back into YAML."""

    indent_width = 2
    base_indent = indent if indent != 2 else 0
    lines: List[str] = []

    def write(line: str) -> None:
        lines.append(line.rstrip())

    def emit_value(value: Any, level: int) -> None:
        if isinstance(value, dict):
            emit_dict(value, level)
        elif isinstance(value, list):
            emit_list(value, level)
        else:
            write(_indent(level) + _format_scalar(value))

    def emit_dict(mapping: dict[Any, Any], level: int) -> None:
        if not mapping:
            write(_indent(level) + "{}")
            return
        for key, value in mapping.items():
            prefix = _indent(level) + f"{key}:"
            if _is_scalar(value):
                write(prefix + (" " + _format_scalar(value) if value is not None else " null"))
            else:
                write(prefix)
                emit_value(value, level + 1)

    def emit_list(items: list[Any], level: int) -> None:
        if not items:
            write(_indent(level) + "[]")
            return
        for item in items:
            prefix_indent = _indent(level) or " "
            prefix = prefix_indent + "-"
            if _is_scalar(item):
                write(prefix + " " + _format_scalar(item))
            elif isinstance(item, dict):
                if not item:
                    write(prefix + " {}")
                    continue
                iterator = iter(item.items())
                first_key, first_value = next(iterator)
                if _is_scalar(first_value):
                    write(prefix + f" {first_key}: " + _format_scalar(first_value))
                else:
                    write(prefix + f" {first_key}:")
                    emit_value(first_value, level + 2)
                for key, value in iterator:
                    entry_prefix = _indent(level + 1) + f"{key}:"
                    if _is_scalar(value):
                        write(entry_prefix + " " + _format_scalar(value))
                    else:
                        write(entry_prefix)
                        emit_value(value, level + 2)
            else:
                write(prefix)
                emit_value(item, level + 1)

    def _indent(level: int) -> str:
        return " " * (base_indent + indent_width * level)

    emit_value(data, 0)
    return "\n".join(lines)


def _format_scalar(value: Any) -> str:
    if value is True:
        return "true"
    if value is False:
        return "false"
    if value is None:
        return "null"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        if value == "":
            return '""'
        if any(char in value for char in ':"\n') or value.strip() != value:
            return json.dumps(value)
        return value
    return json.dumps(value)


def _is_scalar(value: Any) -> bool:
    return not isinstance(value, (dict, list))

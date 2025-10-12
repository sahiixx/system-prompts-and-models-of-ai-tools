# **System Prompts and Models of AI Tools**  
---
<p align="center">
  <sub>Special thanks to</sub>  
</p>

<## 📚 Repository Documentation

This repository now includes comprehensive analysis and reference materials:

### 🔍 Quick Reference & Comparison
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Tool finder, decision tree, budget guide
- **[COMPARISON.md](./COMPARISON.md)** - Feature matrix comparing all 32 tools

### 📚 Analysis & Patterns
- **[TOOL_PATTERNS.md](./TOOL_PATTERNS.md)** - 26 common patterns across AI tools
- **[BEST_PRACTICES.md](./BEST_PRACTICES.md)** - Extracted best practices from all tools
- **[SECURITY_PATTERNS.md](./SECURITY_PATTERNS.md)** - Security guidelines and patterns
- **[EVOLUTION.md](./EVOLUTION.md)** - How prompts evolved from 2023 to 2025
- **[VISUALIZATIONS.md](./VISUALIZATIONS.md)** - 15+ Mermaid diagrams and architecture charts
- **[REVERSE_ENGINEERING_GUIDE.md](./REVERSE_ENGINEERING_GUIDE.md)** - How to extract system prompts

### 🤝 Contributing & Community
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute to this repository
- **[MISSING_TOOLS.md](./MISSING_TOOLS.md)** - 22 notable tools we need to add
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and updates

### 🚀 New Features

#### 📊 **Metadata System**
- **32 JSON metadata files** with structured data for all tools
- **Automated metadata generation** using `scripts/generate-metadata.py`
- **Consistent schema** across all tools (type, pricing, features, models, patterns)
- **Version tracking** for prompt evolution
- **[Metadata README](./metadata/README.md)** - Complete schema documentation

#### 🔌 **REST API Endpoints**
- **39 JSON API endpoints** for programmatic access
- **6 aggregate endpoints:** index, by-type, by-pricing, features, statistics, search
- **32 individual tool endpoints** in `/api/tools/`
- **Easy integration** with any programming language
- **[API README](./api/README.md)** - Complete API documentation with examples

```javascript
// Example: Fetch all tools
fetch('./api/index.json')
  .then(res => res.json())
  .then(data => console.log(data.tools));
```

#### 🎨 **Enhanced Site Generator**
- **Modern UI** with dark/light theme toggle
- **Full-text search** across all files and tools
- **Advanced filters** by type, pricing, and features
- **Three view modes:** Files, Tools, Comparison
- **Syntax highlighting** with one-click code copying
- **Mobile-responsive** design
- **Run:** `cd site && npm install && node build-enhanced.js`

#### 🔄 **Version Comparison Tool**
- **Side-by-side diff viewer** for prompt versions
- **HTML visualization** with syntax highlighting
- **Similarity scoring** and change statistics
- **Batch comparison** for all versions
- **Run:** `python scripts/compare-versions.py --tool "Cursor Prompts" --all`

#### 🤖 **Automation Scripts**
- **Metadata generator:** Auto-detect patterns, features, versions
- **API generator:** Create all 39 endpoints automatically
- **Version comparator:** Track prompt evolution
- **Validation scripts:** Ensure data consistency
- **See:** `scripts/` directory for all automation tools

#### 📖 **Complete Documentation**
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Full feature overview
- **[metadata/README.md](./metadata/README.md)** - Metadata schema guide
- **[api/README.md](./api/README.md)** - API usage examples
- **[scripts/METADATA_GENERATION.md](./scripts/METADATA_GENERATION.md)** - Generator docs
- **[scripts/VERSION_COMPARISON.md](./scripts/VERSION_COMPARISON.md)** - Comparison guide
  <a href="https://latitude.so/developers?utm_source=github&utm_medium=readme&utm_campaign=prompt_repo_sponsorship">
    <img src="assets/Latitude_logo.png" alt="Latitude Logo" width="700"/>
  </a>
</p>

<div align="center" markdown="1">


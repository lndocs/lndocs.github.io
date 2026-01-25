---
sidebar_position: 1
title: Contributing
description: How to contribute to LNbits
---

# Contributing to LNbits

We welcome contributions to LNbits! Here's how to get involved.

## Ways to Contribute

- **Code**: Fix bugs, add features
- **Documentation**: Improve docs, add examples
- **Extensions**: Create new extensions
- **Testing**: Report bugs, test PRs
- **Community**: Help users, answer questions

## Getting Started

### Fork & Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/lnbits.git
cd lnbits
git remote add upstream https://github.com/lnbits/lnbits.git
```

### Development Setup

```bash
# Install UV
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync --all-extras --dev

# Install pre-commit hooks
make install-pre-commit-hook

# Run in development mode
make dev
```

## Making Changes

### Create a Branch

```bash
git checkout -b feature/my-feature
```

### Code Quality

```bash
# Format code
make format

# Run linting
make lint

# Type checking
make mypy

# All checks
make all
```

### Testing

```bash
# Run tests
make test

# With coverage
make test-cov
```

## Pull Request Process

1. **Ensure tests pass**: `make all`
2. **Update documentation** if needed
3. **Write clear commit messages**
4. **Create PR** against `main` branch
5. **Respond to feedback**

### PR Guidelines

- Keep PRs focused on one change
- Reference related issues
- Include tests for new features
- Update docs if needed

## Commit Messages

Follow conventional commits:

```
feat: add new payment feature
fix: resolve wallet balance issue
docs: update API documentation
refactor: simplify payment logic
test: add tests for extension
```

## Code Style

- Use Black for formatting
- Follow PEP 8
- Type hints required
- Docstrings for public functions

## Extension Contributions

Extensions can be:
- Added to official registry
- Hosted independently

See [Extension Development](/docs/extensions/development).

## Community

- **Telegram**: [t.me/lnbits](https://t.me/lnbits)
- **GitHub Issues**: Bug reports, feature requests
- **Discussions**: Questions, ideas

## License

Contributions are licensed under MIT.

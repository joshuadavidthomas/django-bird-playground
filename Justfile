set dotenv-load := true
set unstable := true

[private]
default:
    @just --list --list-submodules

# Build Claude Code container
build:
    docker build -f Dockerfile.claude -t claude-dev .

# Run Claude Code in bypass permissions mode
claude *ARGS:
    docker run -it --rm \
        -v "{{justfile_directory()}}:/workspace" \
        claude-dev \
        claude --dangerously-skip-permissions {{ ARGS }}

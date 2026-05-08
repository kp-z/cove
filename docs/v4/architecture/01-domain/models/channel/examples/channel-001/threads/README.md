# Threads Directory

This directory contains thread data for the channel.

## Structure
- Each thread is stored as a separate directory: `thread-{msg_id}/`
- Thread metadata is in `thread.yaml`
- Thread messages are in `messages.jsonl`

## Example Thread Structure
```
thread-msg_001/
├── thread.yaml      # Thread metadata
└── messages.jsonl   # Thread messages
```

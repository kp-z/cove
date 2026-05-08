# Messages Directory

This directory contains message history for the channel.

## Structure
- Messages are stored in JSONL format (one JSON object per line)
- Files are organized by date: `YYYY-MM-DD.jsonl`
- Each message includes metadata, content, and references

## Example Message
```json
{"id":"msg_001","channel_id":"ch_general_001","author_id":"usr_alice_001","content":"Hello everyone!","created_at":"2026-01-15T10:30:00Z","type":"text"}
```

#!/usr/bin/env python3
"""
Fix all router files to throw the result of mapErrorToTRPC
"""

import re
import os

router_files = [
    'src/infrastructure/trpc/routers/message.router.ts',
    'src/infrastructure/trpc/routers/workflow.router.ts',
    'src/infrastructure/trpc/routers/user.router.ts',
    'src/infrastructure/trpc/routers/task.router.ts',
    'src/infrastructure/trpc/routers/thread.router.ts',
    'src/infrastructure/trpc/routers/project.router.ts',
]

for file_path in router_files:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path} (not found)")
        continue

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace mapErrorToTRPC(error); with throw mapErrorToTRPC(error);
    # But only if it's not already throw
    content = re.sub(
        r'(\s+)mapErrorToTRPC\(error\);',
        r'\1throw mapErrorToTRPC(error);',
        content
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Fixed {file_path}")

print("Done!")

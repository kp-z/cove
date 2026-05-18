#!/usr/bin/env python3
import re

# Read the file
with open('src/application/services/task/task.service.test.ts', 'r') as f:
    content = f.read()

# Pattern 1: const result = await taskService.method(...)
# We need to find the complete statement including the semicolon
pattern1 = re.compile(
    r'^(\s+)(const result = await taskService\.[^;]+;)$',
    re.MULTILINE
)

def replace1(match):
    indent = match.group(1)
    statement = match.group(2)
    # Extract just the method call (remove 'const result = await ')
    method_call = statement.replace('const result = await ', '').rstrip(';')
    return f'''{indent}const result = await runWithContext(testContext, async () => {{
{indent}  return await {method_call};
{indent}}});'''

content = pattern1.sub(replace1, content)

# Pattern 2: await taskService.method(...) (no assignment)
pattern2 = re.compile(
    r'^(\s+)(await taskService\.[^;]+;)$',
    re.MULTILINE
)

def replace2(match):
    indent = match.group(1)
    statement = match.group(2)
    # Extract just the method call (remove 'await ')
    method_call = statement.replace('await ', '').rstrip(';')
    return f'''{indent}await runWithContext(testContext, async () => {{
{indent}  await {method_call};
{indent}}});'''

content = pattern2.sub(replace2, content)

# Write back
with open('src/application/services/task/task.service.test.ts', 'w') as f:
    f.write(content)

print("Fixed task.service.test.ts")

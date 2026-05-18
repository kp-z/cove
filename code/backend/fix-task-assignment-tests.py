#!/usr/bin/env python3
"""
Fix task-assignment.service.spec.ts to wrap all service calls with runWithContext
"""

import re

file_path = 'src/application/services/task/task-assignment.service.spec.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern 1: await service.method(...) - not inside runWithContext
# Replace with: await runWithContext(testContext, async () => { return await service.method(...); })
pattern1 = r'(\s+)(await service\.(assignTask|claimTask|unclaimTask|addDependency|removeDependency)\([^)]+\))'
def replace1(match):
    indent = match.group(1)
    call = match.group(2)
    return f'{indent}await runWithContext(testContext, async () => {{\n{indent}  return {call};\n{indent}}})'

# Pattern 2: await expect(service.method(...)).rejects
# Replace with: await expect(runWithContext(testContext, async () => { return await service.method(...); })).rejects
pattern2 = r'(\s+)(await expect\(\s*)(service\.(assignTask|claimTask|unclaimTask|addDependency|removeDependency)\([^)]+\))(\s*\)\.rejects)'
def replace2(match):
    indent = match.group(1)
    expect_start = match.group(2)
    call = match.group(3)
    expect_end = match.group(5)
    return f'{indent}{expect_start}runWithContext(testContext, async () => {{\n{indent}  return await {call};\n{indent}}}){expect_end}'

# Pattern 3: await expect(service.method(...)).resolves
pattern3 = r'(\s+)(await expect\(\s*)(service\.(assignTask|claimTask|unclaimTask|addDependency|removeDependency)\([^)]+\))(\s*\)\.resolves)'
def replace3(match):
    indent = match.group(1)
    expect_start = match.group(2)
    call = match.group(3)
    expect_end = match.group(5)
    return f'{indent}{expect_start}runWithContext(testContext, async () => {{\n{indent}  return await {call};\n{indent}}}){expect_end}'

# Apply replacements
# First handle expect().rejects and expect().resolves patterns
content = re.sub(pattern2, replace2, content)
content = re.sub(pattern3, replace3, content)

# Then handle standalone await service.method() calls
# But skip lines that already have runWithContext
lines = content.split('\n')
result_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    # Check if this line has a standalone service call (not already wrapped)
    if re.search(r'^\s+await service\.(assignTask|claimTask|unclaimTask|addDependency|removeDependency)\(', line):
        # Check if the previous line or this line already has runWithContext
        prev_line = result_lines[-1] if result_lines else ''
        if 'runWithContext' not in prev_line and 'runWithContext' not in line:
            # This is a standalone call, wrap it
            match = re.match(r'(\s+)(await service\..+)', line)
            if match:
                indent = match.group(1)
                call = match.group(2)
                # Check if this is a multi-line call
                if ');' not in line:
                    # Multi-line call, collect all lines
                    full_call = call
                    i += 1
                    while i < len(lines) and ');' not in lines[i]:
                        full_call += '\n' + lines[i]
                        i += 1
                    if i < len(lines):
                        full_call += '\n' + lines[i]
                    result_lines.append(f'{indent}await runWithContext(testContext, async () => {{')
                    result_lines.append(f'{indent}  return {full_call}')
                    result_lines.append(f'{indent}}});')
                    i += 1
                    continue
                else:
                    # Single line call
                    result_lines.append(f'{indent}await runWithContext(testContext, async () => {{')
                    result_lines.append(f'{indent}  return {call};')
                    result_lines.append(f'{indent}}});')
                    i += 1
                    continue

    result_lines.append(line)
    i += 1

content = '\n'.join(result_lines)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed {file_path}")

#!/usr/bin/env python3
"""
Fix project.service.spec.ts to wrap all service calls with runWithContext
"""

import re

file_path = 'src/application/services/project/project.service.spec.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for expect().resolves
pattern_resolves = r'(\s+)(await expect\(\s*)(service\.(createProject|updateProject|archiveProject|activateProject|deleteProject)\([^)]+\))(\s*\)\.resolves)'
def replace_resolves(match):
    indent = match.group(1)
    expect_start = match.group(2)
    call = match.group(3)
    expect_end = match.group(5)
    return f'{indent}{expect_start}runWithContext(testContext, async () => {{\n{indent}  return await {call};\n{indent}}}){expect_end}'

# Apply replacement
content = re.sub(pattern_resolves, replace_resolves, content)

# Now handle standalone service calls
lines = content.split('\n')
result_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    # Check if this line has a standalone service call (not already wrapped)
    if re.search(r'^\s+(const \w+ = )?await service\.(createProject|updateProject|archiveProject|activateProject|deleteProject)\(', line):
        # Check if already wrapped
        prev_line = result_lines[-1] if result_lines else ''
        if 'runWithContext' not in prev_line and 'runWithContext' not in line:
            # Extract the assignment and call
            match = re.match(r'(\s+)(const \w+ = )?(await service\..+)', line)
            if match:
                indent = match.group(1)
                assignment = match.group(2) or ''
                call = match.group(3)

                # Check if this is a multi-line call
                if ');' not in line:
                    # Multi-line call
                    full_call = call
                    i += 1
                    while i < len(lines) and ');' not in lines[i]:
                        full_call += '\n' + lines[i]
                        i += 1
                    if i < len(lines):
                        full_call += '\n' + lines[i]

                    if assignment:
                        result_lines.append(f'{indent}{assignment}await runWithContext(testContext, async () => {{')
                    else:
                        result_lines.append(f'{indent}await runWithContext(testContext, async () => {{')
                    result_lines.append(f'{indent}  return {full_call}')
                    result_lines.append(f'{indent}}});')
                    i += 1
                    continue
                else:
                    # Single line
                    if assignment:
                        result_lines.append(f'{indent}{assignment}await runWithContext(testContext, async () => {{')
                        result_lines.append(f'{indent}  return {call};')
                        result_lines.append(f'{indent}}});')
                    else:
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

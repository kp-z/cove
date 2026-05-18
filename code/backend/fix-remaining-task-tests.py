#!/usr/bin/env python3
"""
Fix remaining unwrapped service calls in task-assignment.service.spec.ts
"""

file_path = 'src/application/services/task/task-assignment.service.spec.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines to fix (0-indexed): 76, 107, 192, 235, 278, 347
lines_to_fix = [76, 107, 192, 235, 278, 347]

result = []
i = 0
while i < len(lines):
    if i in lines_to_fix:
        line = lines[i]
        # Extract indentation and the call
        indent = len(line) - len(line.lstrip())
        indent_str = ' ' * indent

        # Wrap the call
        result.append(f'{indent_str}const result = await runWithContext(testContext, async () => {{\n')
        result.append(f'{indent_str}  return {line.strip()[len("const result = "):]}\n')
        result.append(f'{indent_str}}});\n')
    else:
        result.append(lines[i])
    i += 1

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(result)

print(f"Fixed {file_path}")

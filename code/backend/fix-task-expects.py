#!/usr/bin/env python3
import re

# Read the file
with open('src/application/services/task/task.service.test.ts', 'r') as f:
    lines = f.readlines()

# Fix patterns that need wrapping
fixed_lines = []
i = 0
while i < len(lines):
    line = lines[i]

    # Pattern: await expect(taskService.method(...)).rejects/resolves
    if 'await expect(taskService.' in line or 'await expect(serviceWithoutMessageRepo.' in line:
        # Extract indentation
        indent = len(line) - len(line.lstrip())
        indent_str = ' ' * indent

        # This is a multi-line expect statement, collect all lines until we find the closing );
        expect_lines = [line]
        j = i + 1
        while j < len(lines) and ');' not in lines[j-1]:
            expect_lines.append(lines[j])
            j += 1

        # Join all lines
        full_statement = ''.join(expect_lines)

        # Extract the service call
        if 'taskService.' in full_statement:
            service_pattern = r'await expect\((taskService\.[^)]+\))'
        else:
            service_pattern = r'await expect\((serviceWithoutMessageRepo\.[^)]+\))'

        match = re.search(service_pattern, full_statement)
        if match:
            service_call = match.group(1)
            # Replace the pattern
            new_statement = full_statement.replace(
                f'await expect({service_call})',
                f'await expect(\n{indent_str}  runWithContext(testContext, async () => {{\n{indent_str}    return {service_call};\n{indent_str}  }})\n{indent_str})'
            )
            fixed_lines.append(new_statement)
            i = j
            continue

    fixed_lines.append(line)
    i += 1

# Write back
with open('src/application/services/task/task.service.test.ts', 'w') as f:
    f.writelines(fixed_lines)

print("Fixed expect patterns in task.service.test.ts")

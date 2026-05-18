#!/usr/bin/env python3
import re

file_path = 'src/application/services/thread/thread.service.test.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Add imports at the top
if 'runWithContext' not in content:
    # Find the last import line
    import_pattern = r'(import.*from.*;\n)(?=\n)'
    matches = list(re.finditer(import_pattern, content))
    if matches:
        last_import_pos = matches[-1].end()
        import_statement = "import { ServerContext } from '../../context/server-context';\nimport { runWithContext } from '../../context/server-context-store';\n"
        content = content[:last_import_pos] + import_statement + content[last_import_pos:]

# Add testContext in beforeEach
if 'let testContext' not in content:
    # Find the beforeEach block and add testContext
    beforeEach_pattern = r'(beforeEach\(\(\) => \{)'
    content = re.sub(
        beforeEach_pattern,
        r'\1\n    let testContext: ServerContext;',
        content
    )

    # Initialize testContext at the start of beforeEach
    content = re.sub(
        r'(beforeEach\(\(\) => \{\n    let testContext: ServerContext;\n)',
        r'\1    testContext = ServerContext.create(\'test-server-id\', \'test-user-id\');\n\n',
        content
    )

# Wrap service method calls
patterns = [
    (r'(const result = )(await threadService\.getOrCreateThread\([^)]+\);)',
     r'\1await runWithContext(testContext, async () => {\n      return \2\n    });'),
    (r'(const result = )(await threadService\.replyInThread\([^)]+\);)',
     r'\1await runWithContext(testContext, async () => {\n      return \2\n    });'),
]

for pattern, replacement in patterns:
    content = re.sub(pattern, replacement, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Fixed thread.service.test.ts")

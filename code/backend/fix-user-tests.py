#!/usr/bin/env python3
import re

file_path = 'src/application/services/user/user.service.test.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Add imports
if 'runWithContext' not in content:
    import_line = "import { ServerContext } from '../../context/server-context';\nimport { runWithContext } from '../../context/server-context-store';\n"
    # Insert after the last import
    content = re.sub(
        r"(import.*from '../../interfaces';)\n",
        r"\1\n" + import_line,
        content
    )

# Add testContext declaration
if 'let testContext' not in content:
    content = re.sub(
        r'(  let mockLogger: ILogger;)\n',
        r'\1\n  let testContext: ServerContext;\n',
        content
    )

    # Initialize in beforeEach
    content = re.sub(
        r'(  beforeEach\(\(\) => \{)\n',
        r'\1\n    testContext = ServerContext.create(\'test-server-id\', \'test-user-id\');\n\n',
        content
    )

# Wrap service calls
patterns = [
    # createUser
    (r'(const result = )(await userService\.createUser\(dto\);)',
     r'\1await runWithContext(testContext, async () => {\n        return \2\n      });'),
    # updateUser
    (r'(const result = )(await userService\.updateUser\([^)]+\);)',
     r'\1await runWithContext(testContext, async () => {\n        return \2\n      });'),
    # updateUserRole
    (r'(const result = )(await userService\.updateUserRole\([^)]+\);)',
     r'\1await runWithContext(testContext, async () => {\n        return \2\n      });'),
]

for pattern, replacement in patterns:
    content = re.sub(pattern, replacement, content)

# Fix expect().resolves patterns
content = re.sub(
    r'await expect\(\s*userService\.createUser\(dto\)\s*\)\.resolves\.not\.toThrow\(\);',
    r'await expect(\n        runWithContext(testContext, async () => {\n          return await userService.createUser(dto);\n        })\n      ).resolves.not.toThrow();',
    content
)

with open(file_path, 'w') as f:
    f.write(content)

print("Fixed user.service.test.ts")

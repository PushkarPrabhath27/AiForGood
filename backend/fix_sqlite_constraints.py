import os
import re

directory = 'db/migrations/versions'
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            new_content = re.sub(r'^\s*op\.create_unique_constraint.*$', '', content, flags=re.MULTILINE)
            new_content = re.sub(r'^\s*op\.drop_constraint.*type_=\'unique\'.*$', '', new_content, flags=re.MULTILINE)
            
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Fixed unique constraints in {filepath}")

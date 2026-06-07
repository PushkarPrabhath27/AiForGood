import os
import re

directory = '.'
for root, dirs, files in os.walk(directory):
    if '.venv' in root: continue
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            if '| None' in content:
                if 'from typing import' in content:
                    if 'Optional' not in content:
                        content = re.sub(r'from typing import (.*)', r'from typing import Optional, \1', content, count=1)
                else:
                    content = 'from typing import Optional\n' + content
                
                content = re.sub(r'([A-Za-z0-9_]+)\s*\|\s*None', r'Optional[\1]', content)
                
                with open(filepath, 'w') as f:
                    f.write(content)
                print(f"Fixed {filepath}")

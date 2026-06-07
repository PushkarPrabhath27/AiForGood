import os

directory = 'db/migrations/versions'
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            if "sa.text('now()')" in content:
                content = content.replace("sa.text('now()')", "sa.text('CURRENT_TIMESTAMP')")
                with open(filepath, 'w') as f:
                    f.write(content)
                print(f"Fixed {filepath}")

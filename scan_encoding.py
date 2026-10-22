#!/usr/bin/env python3
import os

src_dir = r'C:\Users\User\Safe-paws-'

# Search for the Ã character which indicates encoding issues
# in all .tsx, .ts, .html files
found_issues = []

for root, dirs, files in os.walk(src_dir):
    if 'node_modules' in root or '.git' in root:
        continue
    
    for file in files:
        if not (file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.html')):
            continue
        
        filepath = os.path.join(root, file)
        try:
            with open(filepath, 'rb') as f:
                data = f.read()
            text = data.decode('utf8', errors='replace')
            
            if 'Ã' in text:
                idx = text.index('Ã')
                context = text[idx:idx+60]
                found_issues.append((filepath, context))
        except:
            pass

print(f'Found {len(found_issues)} files with encoding issues')
print('---')
for f, c in found_issues[:50]:
    rel = os.path.relpath(f, src_dir)
    print(f'{rel}: {c[:80]}')
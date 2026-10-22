#!/usr/bin/env python3
with open(r'C:\Users\User\Safe-paws-\src\context\AuthProvider.tsx', 'rb') as f:
    data = f.read()
text = data.decode('utf8', errors='replace')

# Find the word around position 4173
idx = text.find('cr', 4160)
if idx >= 0:
    print(f'Found "cr" at {idx}: {repr(text[idx:idx+20])}')

# Search for 'DUE' and 'Paso' 
for pattern in ['crítico', 'DUE', 'Paso']:
    idx = text.find(pattern)
    if idx >= 0:
        print(f'Found "{pattern}" at {idx}: {repr(text[idx:idx+30])}')
    else:
        print(f'Not found: "{pattern}"')
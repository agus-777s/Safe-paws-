#!/usr/bin/env python3
with open(r'C:\Users\User\Safe-paws-\src\context\AuthProvider.tsx', 'rb') as f:
    data = f.read()
text = data.decode('utf8', errors='replace')

# Check for the specific problematic patterns
patterns = ['crítico', 'no es crítico', 'DUE', 'Paso']
for p in patterns:
    idx = text.find(p)
    if idx >= 0:
        print(f'Found "{p}" at {idx}: {repr(text[idx:idx+30])}')
    else:
        print(f'Not found: "{p}"')

# Check for the Ã character
if 'Ã' in text:
    idx = text.index('Ã')
    print(f'Found Ã at index {idx}: {repr(text[idx:idx+30])}')
else:
    print('Ã not found')
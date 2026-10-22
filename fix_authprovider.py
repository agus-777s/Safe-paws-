#!/usr/bin/env python3
with open(r'C:\Users\User\Safe-paws-\src\context\AuthProvider.tsx', 'rb') as f:
    data = f.read()
text = data.decode('utf8', errors='replace')

# The corrupted word is at position 4171-4178
# It appears to be 'crÃ³tica' or similar (cr + A-tilde + acute + tica)
# We need to replace it with 'crítico'

# Let me find the exact old string
old = 'crÃ³tica'  # This is the likely corrupted form
new = 'crítico'

print(f'Looking for: {repr(old)}')
print(f'In text: {old in text}')

if old in text:
    text = text.replace(old, new, 1)
    print(f'Replaced: {repr(old)} -> {repr(new)}')
else:
    # Try alternative patterns
    alternatives = ['crÃ�tica', 'crâ‚³tica', 'crÃ¢â‚¬â‚¢tica']
    for alt in alternatives:
        print(f'Alternative {repr(alt)}: {alt in text}')
    print('Could not find the exact pattern')

with open(r'C:\Users\User\Safe-paws-\src\context\AuthProvider.tsx', 'w', encoding='utf8') as f:
    f.write(text)

print('File written')
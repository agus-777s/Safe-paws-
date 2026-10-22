#!/usr/bin/env python3
with open(r'C:\Users\User\Safe-paws-\vitest.config.ts', 'rb') as f:
    data = f.read()

text = data.decode('utf8', errors='replace')

# Find and replace "dÃ­as" with "días"
idx = text.find('dÃ­as')
if idx >= 0:
    text = text.replace('dÃ­as', 'días', 1)
    print('Replaced dÃ­as with días')
else:
    print('dÃ­as not found')

# Write back
with open(r'C:\Users\User\Safe-paws-\vitest.config.ts', 'w', encoding='utf8') as f:
    f.write(text)

print('File updated successfully')
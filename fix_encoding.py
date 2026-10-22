#!/usr/bin/env python3
import sys

filepath = r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx'

with open(filepath, 'r', encoding='utf8') as f:
    content = f.read()

# Replace the broken dash sequences with simple hyphens
# The sequences â€— and â€– are UTF-8 bytes interpreted as Latin-1
replacements = [
    ( "'â€—'", "'-' "),
    ( 'â€–', '-' ),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f'Replaced: {repr(old)} -> {repr(new)}')
    else:
        print(f'Not found: {repr(old)}')

with open(filepath, 'w', encoding='utf8') as f:
    f.write(content)

print('Done. File written.')
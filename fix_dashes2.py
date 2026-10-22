#!/usr/bin/env python3
import os

filepath = r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx'

with open(filepath, 'r', encoding='utf8') as f:
    content = f.read()

# From the byte analysis, the file contains these corrupted sequences:
# - Position 52-54: â€— (U+00E2 U+20AC U+201D) - em dash corruption
# - Position 82-84: â€– (U+00E2 U+20AC U+201C) - en dash corruption

# Replace em dash corruption with proper em dash
old1 = '\u00e2\u20ac\u2014'  # â€—
new1 = '\u2014'  # —

# Replace en dash corruption with proper en dash  
old2 = '\u00e2\u20ac\u2013'  # â€–
new2 = '\u2013'  # –

changes = 0
if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print(f'Replaced em dash corruption: {repr(old1)} -> {repr(new1)}')
else:
    print(f'em dash corruption not found: {repr(old1)}')

if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print(f'Replaced en dash corruption: {repr(old2)} -> {repr(new2)}')
else:
    print(f'en dash corruption not found: {repr(old2)}')

if changes > 0:
    with open(filepath, 'w', encoding='utf8') as f:
        f.write(content)
    print(f'File updated. Total changes: {changes}')
else:
    print('No changes made.')
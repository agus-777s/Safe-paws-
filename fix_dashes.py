#!/usr/bin/env python3
import os

filepath = r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx'

with open(filepath, 'r', encoding='utf8') as f:
    content = f.read()

# The Read output showed line 328 as:
# `Días ${cuidador.dias.join(' ') || 'â€—'} · ${cuidador.horaInicio}â€–${cuidador.horaFin}`.trim(),
# We need to replace the broken dash sequences

# Replace 'â€—' with '-' (simple hyphen inside the string)
old1 = "|| 'â€—'"
new1 = "|| '-'"

# Replace â€– (en dash) with '-' (hyphen)
# This appears after horaFin before the closing backtick
old2 = 'â€–'
new2 = '-'

changes = 0
if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print(f'Replaced: {repr(old1)} -> {repr(new1)}')
else:
    print(f'Not found: {repr(old1)}')

if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print(f'Replaced: {repr(old2)} -> {repr(new2)}')
else:
    print(f'Not found: {repr(old2)}')

if changes > 0:
    with open(filepath, 'w', encoding='utf8') as f:
        f.write(content)
    print(f'File updated. Total changes: {changes}')
else:
    print('No changes made.')
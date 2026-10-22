#!/usr/bin/env python3
with open(r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx', 'rb') as f:
    data = f.read()
text = data.decode('utf8', errors='replace')
idx = text.find('Pol')
if idx >= 0:
    print('Found "Pol" at index', idx)
    print('Surrounding:', repr(text[idx:idx+20]))
    if idx + 3 < len(text):
        print('Char after Pol:', repr(text[idx+3]), 'ord:', hex(ord(text[idx+3])))
else:
    print('"Pol" not found')
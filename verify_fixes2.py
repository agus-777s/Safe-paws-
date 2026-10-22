#!/usr/bin/env python3
with open(r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx', 'rb') as f:
    data = f.read()
text = data.decode('utf8', errors='replace')

p1 = 'Política' in text
p2 = 'DUEÑO' in text
p3 = 'ðŸ¾' in text
p4 = 'â€—' in text
p5 = 'â€–' in text

with open(r'C:\Users\User\Safe-paws-\src\pages\auth\IniciarSesionPage.tsx', 'rb') as f:
    data = f.read()
text2 = data.decode('utf8', errors='replace')

p6 = 'aún' in text2
p7 = 'múltiples envíos' in text2
p8 = '¿No' in text2
p9 = 'Regístra' in text2

print('FIX VERIFICATION')
print('==============')
print()
print('RegistroPage.tsx:')
print('  Política fix:     ', p1)
print('  DUEÑO fix:        ', p2)
print('  Emoji fallback:   ', 'present' if p3 else 'removed')
print('  Em dash corrupt:  ', 'present' if p4 else 'removed')
print('  En dash corrupt:  ', 'present' if p5 else 'removed')
print()
print('IniciarSesionPage.tsx:')
print('  aún fix:          ', p6)
print('  envíos fix:       ', p7)
print('  ? inversion:      ', 'fixed' if p8 else 'not fixed')
print('  Regístra fix:     ', p9)
print()
all_ok = p1 and p2 and not p3 and not p4 and not p5 and p6 and p7 and p8 and p9
print('ALL FIXES SUCCESSFUL:', all_ok)
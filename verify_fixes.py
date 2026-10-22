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

print('=== FIX VERIFICATION ===')
print()
print('RegistroPage.tsx:')
print('  Política fix:', p1)
print('  DUEÑO fix:', p2)
print('  Emoji fallback removed:', not p3, '(was: ðŸ¾ present=%s)' % p3)
print('  Em dash corruption removed:', not p4, '(was: â€— present=%s)' % p4)
print('  En dash corruption removed:', not p5, '(was: â€– present=%s)' % p5)
print()
print('IniciarSesionPage.tsx:')
print('  aún fix:', p6)
print('  múltiplos envíos fix:', p7)
print('  ¿ inversion fixed:', p8)
print('  Regístra fix:', p9)
print()
all_ok = all([p1, p2, not p3, not p4, not p5, p6, p7, p8, p9])
print('ALL FIXES APPLIED:', all_ok)
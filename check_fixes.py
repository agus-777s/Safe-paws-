#!/usr/bin/env python3
with open(r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx', 'rb') as f:
    data = f.read()
text = data.decode('utf8', errors='replace')

# Check each fix
checks = [
    ("Política", "Política correcta"),
    ("DUEÑO", "DUEÑO correcto"),
    ("ðŸ¾", "emoji corrupto ðŸ¾"),
]

for pattern, desc in checks:
    if pattern in text:
        print(f'FOUND: {desc}')
    else:
        print(f'NOT FOUND: {desc}')

# Check for the dash sequences specifically
dash1 = "|| 'â€—'"
dash2 = 'â€–'

print(f'dash1 (|| \\'â€—\\') in text: {dash1 in text}')
print(f'dash2 (â€–) in text: {dash2 in text}')

# Check for the IniciarSesionPage issues
inicio_checks = [
    ("aún", "aún"),
    ("múltiples envíos", "múltiples envíos"),
    ("Escríbenos", "Escríbenos"),
    ("Regístrate", "Regístrate"),
    ("Â¿", "Â¿ invertida"),
]

print("\nIniciarSesionPage checks:")
for pattern, desc in inicio_checks:
    if pattern in text:
        print(f'FOUND: {desc}')
    else:
        print(f'NOT FOUND: {desc}')
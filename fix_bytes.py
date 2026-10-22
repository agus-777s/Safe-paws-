#!/usr/bin/env python3
with open(r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx', 'rb') as f:
    data = f.read()

# From the byte analysis, the file contains these corrupted sequences:
# â€" = U+00E2 U+20AC U+201D in Latin-1, which in UTF-8 is: c3 82 e2 82 ac e2 80 9d
# â€" = U+00E2 U+20AC U+201C in Latin-1, which in UTF-8 is: c3 82 e2 82 ac e2 80 93

# Actually let me just use the hex patterns we identified from the analysis:
# Position 52-54: the em dash corruption sequence
# Position 82-84: the en dash corruption sequence

# From the earlier Python analysis output:
# Non-ASCII at 52: char='â' ord=00e2
# Non-ASCII at 53: char='€' ord=20ac
# Non-ASCII at 54: char='}' ord=201d - wait, 201d is RIGHT DOUBLE QUOTATION MARK " 
# Non-ASCII at 82: char='â' ord=00e2
# Non-ASCII at 83: char='€' ord=20ac
# Non-ASCII at 84: char='"' ord=201c - 201c is LEFT DOUBLE QUOTATION MARK "

# So the sequences are:
# â€" = bytes c3 82 e2 82 ac e2 80 9d (but wait, 00e2 in UTF-8 is c3 82, 20ac is e2 82 ac, 201d is e2 80 9d)
# Actually U+00E2 in UTF-8 is c3 82 (2 bytes)
# U+20AC in UTF-8 is e2 82 ac (3 bytes)
# U+201D in UTF-8 is e2 80 9d (3 bytes)
# Total: 2 + 3 + 3 = 8 bytes: c3 82 e2 82 ac e2 80 9d

# U+2013 (en dash) in UTF-8 is e2 80 93 (3 bytes)
# So â€– = c3 82 e2 82 ac e2 80 93 (8 bytes)

pattern1_hex = 'c382e282ace2809d'  # â€" (em dash corruption)
pattern2_hex = 'c382e282ace28093'  # â€– (en dash corruption)

pattern1 = bytes.fromhex(pattern1_hex)
pattern2 = bytes.fromhex(pattern2_hex)

print(f"Pattern1 (em dash corruption): {pattern1}")
print(f"Pattern2 (en dash corruption): {pattern2}")

pos1 = data.find(pattern1)
pos2 = data.find(pattern2)

print(f"Pattern1 found at position: {pos1}")
print(f"Pattern2 found at position: {pos2}")

# Proper replacements in UTF-8:
# Em dash U+2014 = e2 80 9d
# En dash U+2013 = e2 80 93

replacement1 = bytes.fromhex('e2809d')  # — em dash
replacement2 = bytes.fromhex('e28093')  # – en dash

if pos1 >= 0:
    data = data[:pos1] + replacement1 + data[pos1 + len(pattern1):]
    print(f"Replaced em dash corruption at position {pos1}")

if pos2 >= 0:
    data = data[:pos2] + replacement2 + data[pos2 + len(pattern2):]
    print(f"Replaced en dash corruption at position {pos2}")

with open(r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx', 'wb') as f:
    f.write(data)

print('File updated successfully via byte replacement.')
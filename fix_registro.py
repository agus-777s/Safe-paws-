#!/usr/bin/env python3
import os

filepath = r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx'

# Read as binary to handle special characters properly
with open(filepath, 'rb') as f:
    data = f.read()

# Convert to string for processing
text = data.decode('utf8', errors='replace')

# Fix 1: Replace the corrupted em dash sequence 'â€—' with simple hyphen
# The sequence appears as: || 'â€—'
# We need to find and replace it
import re

# Find the dash sequences by looking for the specific byte patterns
# From earlier analysis, the em dash corruption is at positions that include:
# - The '|| ' part and the 'â€—' part

# Let's search for the pattern string-wise
patterns_to_fix = [
    # (search_string, replacement_string)
    ("|| 'â€—'", "|| '-'"),  # em dash in the OR expression
    ("â€–", "-"),  # en dash after horaFin
]

changes_made = 0
for search, replace in patterns_to_fix:
    if search in text:
        text = text.replace(search, replace)
        changes_made += 1
        print(f"Replaced: {repr(search)} -> {repr(replace)}")
    else:
        print(f"Not found: {repr(search)}")

# Also fix the 'PolÃ­tica' -> 'Política' corruption
pol_search = "PolÃ­tica"
pol_replace = "Política"
if pol_search in text:
    text = text.replace(pol_search, pol_replace)
    changes_made += 1
    print(f"Replaced: {repr(pol_search)} -> {repr(pol_replace)}")
else:
    print(f"Not found: {repr(pol_search)}")

# Fix the emoji fallback ðŸ¾ -> 👤
# The corrupted emoji is already in the text as-is
if 'ðŸ¾' in text:
    text = text.replace('ðŸ¾', '👤')
    changes_made += 1
    print(f"Replaced emoji fallback: ðŸ¾ -> 👤")
else:
    print("Emoji fallback not found (may already be fixed)")

# Fix the DUEÃ‘O -> DUEÑO comment
# Search for DUE followed by the corrupted Ñ
# The sequence DUEÃ‘O should become DUEÑO
# Let me search for 'DUE' followed by the corrupted character
import re
dueno_matches = re.findall('DUE.{1}', text)
print(f"DUE patterns: {dueno_matches}")

# Actually, let me just search for 'DUE' and see what follows
idx = text.find('DUE')
if idx >= 0 and idx + 3 < len(text):
    following = text[idx:idx+10]
    print(f"After DUE: {repr(following)}")
    # Check if it's the corrupted version
    if 'Ã' in following:
        # Replace the corrupted sequence
        # DUEÃ‘O -> DUEÑO
        # The Ã‘ is U+00D1 (Ñ) corrupted through encoding issues
        # Let me replace character by character
        new_text = ''
        i = 0
        while i < len(text):
            if text[i:i+4] == 'DUE' and i + 4 < len(text) and text[i+4] == '\u00c3':  # Ã is U+00C3
                # Check if followed by Õ or ñ pattern
                if i + 5 < len(text) and text[i+5] == '\u00b1':  # ñ is U+00F1
                    new_text += 'DUEÑO'
                    i += 6  # Skip DUE + Ã + Õ
                else:
                    new_text += 'DUE' + text[i+3:]
                    break
            else:
                new_text += text[i]
                i += 1
        text = new_text
        changes_made += 1
        print("Fixed DUEÑO comment")

# Write the fixed content back
with open(filepath, 'w', encoding='utf8') as f:
    f.write(text)

print(f'\nTotal changes made: {changes_made}')
print('File updated successfully.')
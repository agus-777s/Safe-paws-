#!/usr/bin/env python3
import os

filepath = r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx'

with open(filepath, 'rb') as f:
    content = f.read()

text = content.decode('utf-8')

# Print the relevant line (line 328, 0-indexed 327)
lines = text.split('\n')
line328 = lines[327]
print("Line 328 (raw):", repr(line328))
print()

# Find all non-ASCII regions and their byte sequences
i = 0
while i < len(line328):
    if ord(line328[i]) > 127:
        start = i
        byte = ord(line328[i])
        if byte >= 0xF0:
            length = 4
        elif byte >= 0xE0:
            length = 3
        elif byte >= 0xC0:
            length = 2
        else:
            i += 1
            continue
        
        seq = line328[i:i+length]
        byte_seq = content[start:start+length].hex()
        print(f"Non-ASCII at {start}: {repr(seq)} (bytes: {byte_seq})")
        i += length
    else:
        i += 1
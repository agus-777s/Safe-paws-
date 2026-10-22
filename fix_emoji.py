#!/usr/bin/env python3
with open(r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx', 'rb') as f:
    data = f.read()

# Replace the corrupted emoji fallback ðŸ¾ with 👤
# The corrupted emoji is: ðŸ (U+D83D) +  (U+0090) + ¾ (U+00BE)
# The proper emoji is: 👤 (U+1F464)

# In UTF-8:
# ðŸ = F0 9F 80 BD (4 bytes, surrogate pair start)
#  = C2 90 (2 bytes)  
# ¾ = C2 BE (2 bytes)
# Total corrupted: F0 9F 80 BD C2 90 C2 BE (7 bytes)

# Proper 👤 = F0 9F 91 84 (4 bytes)

# Let me search for the corrupted sequence
corrupted = b'\xf0\x9f\x80\xbd\xc2\x90\xc2\xbe'
proper = b'\xf0\x9f\x91\x84'

idx = data.find(corrupted)
print('Corrupted emoji found at:', idx)

if idx >= 0:
    data = data[:idx] + proper + data[idx+len(corrupted):]
    with open(r'C:\Users\User\Safe-paws-\src\pages\auth\RegistroPage.tsx', 'wb') as f:
        f.write(data)
    print('Emoji fix applied')
else:
    print('Corrupted emoji not found (may already be fixed or use different encoding)')
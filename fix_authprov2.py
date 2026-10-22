#!/usr/bin/env python3
with open(r'C:\Users\User\Safe-paws-\src\context\AuthProvider.tsx', 'rb') as f:
    data = f.read()

# Replace from position 4171 with 'crítico' in UTF-8
correct = 'crítico'.encode('utf8')
print('Correct word bytes:', correct.hex(), 'length:', len(correct))

# Replace from 4171
new_data = data[:4171] + correct + data[4171+len(correct):]

with open(r'C:\Users\User\Safe-paws-\src\context\AuthProvider.tsx', 'wb') as f:
    f.write(new_data)

print('AuthProvider.tsx updated')
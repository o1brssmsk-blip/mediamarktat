import re

def remove_bg(filepath, pattern):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(pattern, '', content, flags=re.DOTALL)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

# ASN Bank (regiobank variant)
remove_bg('c:/Users/Administrator/Desktop/Albert Heijn/albert-heijn-demo/public/bank-logos/asn-bank-vh-regiobank.svg', r'<rect width="111" height="36" fill="white"\s*/>\s*')

# bunq
remove_bg('c:/Users/Administrator/Desktop/Albert Heijn/albert-heijn-demo/public/bank-logos/bunq.svg', r'<rect width="40" height="40" fill="#F7D047"\s*/>\s*')

print('Done additional SVGs')

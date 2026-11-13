import re

def remove_bg(filepath, pattern):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(pattern, '', content, flags=re.DOTALL)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

# Triodos Bank
remove_bg('c:/Users/Administrator/Desktop/Albert Heijn/albert-heijn-demo/public/bank-logos/triodos-bank.svg', r'<path d="M160 101\.719.*?fill="white"\s*/>\s*')

# Yoursafe
remove_bg('c:/Users/Administrator/Desktop/Albert Heijn/albert-heijn-demo/public/bank-logos/yoursafe.svg', r'<path d="M40 0H0V40H40V0Z" fill="white"\s*/>\s*')

# ABN Amro
remove_bg('c:/Users/Administrator/Desktop/Albert Heijn/albert-heijn-demo/public/bank-logos/abn-amro.svg', r'<rect width="40" height="40" fill="white"\s*/>\s*')

# Nationale-Nederlanden
remove_bg('c:/Users/Administrator/Desktop/Albert Heijn/albert-heijn-demo/public/bank-logos/nationale-nederlanden.svg', r'<path class="cls-9" d="m69\.54.*?/>\s*')

print('Done')

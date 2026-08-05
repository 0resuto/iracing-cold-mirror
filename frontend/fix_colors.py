import os
import re

directory = r"c:\Users\Engineer\Desktop\Cold mirror\frontend\src"

replacements = {
    r"text-text-muted": "text-brand-10/60",
    r"text-text-main": "text-brand-10",
    r"bg-bg-surface-hover": "bg-brand-60/80",
    r"bg-bg-surface": "bg-brand-60",
    r"bg-bg-base": "bg-brand-bg",
    r"border-border-strong": "border-brand-60",
    r"var\(--color-bg-surface\)": "var(--color-brand-60)",
}


def process_file(filepath):
    if not filepath.endswith((".jsx", ".js")):
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = content
    for old, new in replacements.items():
        new_content = re.sub(old, new, new_content)

    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated {os.path.basename(filepath)}")


for root, _, files in os.walk(directory):
    for file in files:
        process_file(os.path.join(root, file))

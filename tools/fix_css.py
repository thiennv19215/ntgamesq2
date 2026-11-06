import re

with open('src/game/stage.css', 'rb') as f:
    content = f.read().decode('utf-8')

# Replace duplicated .classroom-board::after block
old_pattern = r'\.classroom-board::after\s*\{\s*content:\s*""[^}]*\}'
replacement = '''.classroom-board::before,
.classroom-board::after {
  content: '';
  position: absolute;
  pointer-events: none;
}'''

new_content = re.sub(old_pattern, replacement, content)
with open('src/game/stage.css', 'wb') as f:
    f.write(new_content.encode('utf-8'))

print("stage.css updated successfully")

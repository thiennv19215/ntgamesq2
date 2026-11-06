with open('src/game/GameStage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def remove_function(lines, func_name):
    start = -1
    for i, line in enumerate(lines):
        if f'function {func_name}(' in line:
            start = i
            # Look backwards for comments immediately preceding
            while start > 0 and lines[start - 1].strip().startswith('//'):
                start -= 1
            break
    if start == -1:
        print(f"Could not find function {func_name}")
        return lines

    # Find the closing brace of the function
    # The function ends at the line starting with '}' with 0 indentation
    end = -1
    for j in range(start, len(lines)):
        if lines[j].startswith('}'):
            end = j + 1
            # Also eat an empty line after if present
            if end < len(lines) and lines[end].strip() == '':
                end += 1
            break

    print(f"Removing {func_name} from line {start+1} to {end}")
    return lines[:start] + lines[end:]

for name in ['ClassFund', 'TeamBoard', 'TalkTop']:
    lines = remove_function(lines, name)

with open('src/game/GameStage.tsx', 'w', encoding='utf-8', newline='') as f:
    f.writelines(lines)

print("Finished removing functions.")

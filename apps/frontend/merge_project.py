import os

# Configuration
OUTPUT_FILE = "project_context.txt"
SKIP_DIRS = {'.git', 'node_modules', '__pycache__', 'venv', 'env', '.idea', '.vscode'}
SKIP_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.dll', '.exe', '.pyc', '.pdf'}

def merge_files():
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk('.'):
            # Skip unwanted directories
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            
            for file in files:
                if any(file.endswith(ext) for ext in SKIP_EXTENSIONS):
                    continue
                
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        outfile.write(f"\n\n{'='*50}\nFILE: {file_path}\n{'='*50}\n")
                        outfile.write(infile.read())
                except Exception as e:
                    print(f"Could not read {file_path}: {e}")

    print(f"✅ Done! All files merged into '{OUTPUT_FILE}'")

if __name__ == "__main__":
    merge_files()

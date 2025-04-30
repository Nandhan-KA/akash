import os
import sys
import subprocess
import platform
import shutil
from pathlib import Path

PYTHON_EXE = r"C:\\Users\\NandhanK\\AppData\\Local\\Programs\\Python\\Python38\\python.exe"

def print_step(message):
    """Print a step message with formatting"""
    print("\n" + "="*50)
    print(message)
    print("="*50)

def run_command(command, check=True):
    """Run a command and return the return code"""
    print(f"Running: {command}")
    try:
        result = subprocess.run(command, shell=True, check=check)
        return result.returncode == 0
    except subprocess.CalledProcessError:
        return False

def check_python():
    """Check if Python is correctly installed and accessible"""
    print_step("Checking Python Installation (using explicit path)")
    if not os.path.exists(PYTHON_EXE):
        print(f"ERROR: Python not found at {PYTHON_EXE}")
        print("Please ensure Python 3.8 or later is installed at the specified path.")
        return None
    # Check version
    version_cmd = f'"{PYTHON_EXE}" --version'
    result = subprocess.run(version_cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"Found Python: {result.stdout.strip()}")
        return PYTHON_EXE
    print("ERROR: Could not run Python at the specified path.")
    return None

def fix_virtual_env(python_cmd):
    """Fix or recreate the virtual environment"""
    print_step("Fixing Virtual Environment")
    
    # Remove existing virtual environment if it's corrupted
    venv_path = Path("venv")
    if venv_path.exists():
        print("Removing existing virtual environment...")
        try:
            shutil.rmtree(venv_path)
            print("Successfully removed old virtual environment")
        except Exception as e:
            print(f"Warning: Failed to remove old environment: {e}")
    
    # Create a new virtual environment
    print(f"Creating new virtual environment using {python_cmd}...")
    success = run_command(f'"{python_cmd}" -m venv venv')
    
    if not success:
        print("Failed to create virtual environment with venv module.")
        print("Trying with virtualenv module...")
        
        # Install virtualenv if needed
        run_command(f'"{python_cmd}" -m pip install virtualenv', check=False)
        
        # Try creating with virtualenv
        success = run_command(f'"{python_cmd}" -m virtualenv venv')
        
        if not success:
            print("ERROR: Failed to create virtual environment.")
            return False
    
    print("Virtual environment created successfully!")
    return True

def install_dependencies():
    """Install project dependencies with the fixed virtual environment"""
    print_step("Installing Dependencies")
    
    # Determine the correct pip command based on platform
    if platform.system() == "Windows":
        pip_cmd = ".\\venv\\Scripts\\pip"
        python_cmd = ".\\venv\\Scripts\\python"
    else:
        pip_cmd = "./venv/bin/pip"
        python_cmd = "./venv/bin/python"
    
    # Upgrade pip first
    print("Upgrading pip...")
    run_command(f'"{pip_cmd}" install --upgrade pip --user', check=False)
    
    # Install required packages directly
    print("Installing core packages individually...")
    
    # Core packages that are often problematic when installed together
    core_packages = [
        "flask>=2.0.0",
        "flask-cors>=3.0.10",
        "opencv-python>=4.5.0",
        "numpy>=1.20.0",
        "pillow>=8.0.0",
    ]
    
    for package in core_packages:
        run_command(f'"{pip_cmd}" install {package}', check=False)
    
    # Try installing dlib
    print("Installing dlib...")
    dlib_success = False
    
    # Try pre-built wheel first
    dlib_wheel = "https://github.com/Murtaza-Saeed/Dlib-Precompiled-Wheels-for-Python-on-Windows-x64-Easy-Installation/raw/master/dlib-19.19.0-cp38-cp38-win_amd64.whl"
    if run_command(f'"{pip_cmd}" install {dlib_wheel}', check=False):
        dlib_success = True
    
    # If wheel failed, try normal install
    if not dlib_success:
        print("Trying standard dlib install...")
        dlib_success = run_command(f'"{pip_cmd}" install dlib==19.19.0 --user', check=False)
    
    # If still failed, try simplified version
    if not dlib_success:
        print("Trying simplified dlib install...")
        dlib_success = run_command(f'"{pip_cmd}" install dlib --user', check=False)
    
    # Install remaining packages from requirements.txt if it exists
    if os.path.exists("requirements.txt"):
        print("Installing remaining requirements...")
        run_command(f'"{pip_cmd}" install -r requirements.txt --user', check=False)
    
    # Try to download shape predictor model if needed
    shape_predictor_file = Path("shape_predictor_68_face_landmarks.dat")
    download_script = Path("download_shape_predictor.py")
    
    if download_script.exists() and not shape_predictor_file.exists():
        print("Downloading shape predictor model...")
        run_command(f'"{python_cmd}" download_shape_predictor.py', check=False)

def main():
    """Main function to fix the Python setup"""
    print_step("Python Environment Fix Utility")
    
    # Check for Python installation
    python_cmd = check_python()
    if not python_cmd:
        print("Please install Python 3.8 or later at the specified path and try again.")
        return False
    
    # Fix virtual environment
    if not fix_virtual_env(python_cmd):
        print("Virtual environment setup failed. Please install Python 3.8 manually.")
        return False
    
    # Install dependencies
    install_dependencies()
    
    print_step("Setup Complete")
    print("The Python environment has been fixed.")
    print("You can now run the project using:")
    print("   python run_project.py")
    
    return True

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    main() 
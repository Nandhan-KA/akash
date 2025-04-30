#!/usr/bin/env python
import os
import sys
import subprocess
import platform
import time
import shutil
import io
import urllib.request
from pathlib import Path

# ANSI color codes for colored output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Windows CMD doesn't support ANSI by default, check platform
if platform.system() == "Windows":
    try:
        import colorama
        colorama.init()
    except ImportError:
        # If colorama not installed, disable colors
        for key in dir(Colors):
            if not key.startswith('__'):
                setattr(Colors, key, '')

def print_colored(text, color):
    """Print colored text"""
    print(f"{color}{text}{Colors.ENDC}")

def print_header(text):
    """Print a header with formatting"""
    print("\n" + "="*50)
    print_colored(text, Colors.CYAN)
    print("="*50 + "\n")

def run_command(command, cwd=None, check=True):
    """Run a command and return the return code"""
    try:
        result = subprocess.run(command, cwd=cwd, shell=True, check=check)
        return result.returncode
    except subprocess.CalledProcessError:
        return 1

def check_command_exists(command):
    """Check if a command exists in the path"""
    if platform.system() == "Windows":
        command = f"where {command}"
    else:
        command = f"which {command}"
    
    result = subprocess.run(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return result.returncode == 0

def install_dlib():
    """Install dlib from pre-built wheel"""
    print_colored("Downloading and installing pre-built dlib wheel...", Colors.YELLOW)
    
    # Upgrade pip first
    run_command("python -m pip install --upgrade pip", check=False)
    
    # Direct link to pre-built dlib wheel
    dlib_wheel = "https://github.com/Murtaza-Saeed/Dlib-Precompiled-Wheels-for-Python-on-Windows-x64-Easy-Installation/raw/master/dlib-19.19.0-cp38-cp38-win_amd64.whl"
    
    print(f"Installing dlib from {dlib_wheel}")
    result = run_command(f"python -m pip install {dlib_wheel}", check=False)
    
    if result != 0:
        print_colored("WARNING: Failed to install pre-built dlib. Trying alternative method...", Colors.YELLOW)
        result = run_command("python -m pip install dlib==19.19.0", check=False)
        
        if result != 0:
            print_colored("WARNING: Failed to install dlib. Some features may not work properly.", Colors.RED)
            return False
        else:
            print_colored("Successfully installed dlib 19.19.0", Colors.GREEN)
            return True
    else:
        print_colored("Successfully installed pre-built dlib", Colors.GREEN)
        return True

def download_javascript_models():
    """Download JavaScript models for browser-based detection"""
    print_colored("Checking for JavaScript detection models...", Colors.YELLOW)
    
    # Directory for models
    models_dir = Path("new_project") / "public" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    
    # Face API models for emotion recognition
    face_api_models_dir = models_dir / "face-api"
    if not face_api_models_dir.exists():
        print_colored("Downloading face-api.js models for emotion recognition...", Colors.YELLOW)
        face_api_models_dir.mkdir(parents=True, exist_ok=True)
        
        # Define model URLs to download
        face_api_models = [
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json",
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1",
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-weights_manifest.json",
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-shard1",
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json",
            "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1"
        ]
        
        for model_url in face_api_models:
            model_file = os.path.basename(model_url)
            output_path = face_api_models_dir / model_file
            print(f"  Downloading {model_file}...")
            try:
                urllib.request.urlretrieve(model_url, output_path)
                print_colored(f"  Successfully downloaded {model_file}", Colors.GREEN)
            except Exception as e:
                print_colored(f"  Failed to download {model_file}: {str(e)}", Colors.RED)
    else:
        print_colored("Face-api.js models already exist", Colors.GREEN)
    
    # TensorFlow.js models for phone detection
    tf_models_dir = models_dir / "tfjs"
    if not tf_models_dir.exists():
        print_colored("Downloading TensorFlow.js models for phone detection...", Colors.YELLOW)
        tf_models_dir.mkdir(parents=True, exist_ok=True)
        
        # COCO-SSD model for object detection (including phones)
        coco_ssd_dir = tf_models_dir / "coco-ssd"
        coco_ssd_dir.mkdir(parents=True, exist_ok=True)
        
        coco_ssd_models = [
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json",
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/group1-shard1of5",
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/group1-shard2of5",
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/group1-shard3of5",
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/group1-shard4of5",
            "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/group1-shard5of5"
        ]
        
        for model_url in coco_ssd_models:
            model_file = os.path.basename(model_url)
            output_path = coco_ssd_dir / model_file
            print(f"  Downloading {model_file}...")
            try:
                urllib.request.urlretrieve(model_url, output_path)
                print_colored(f"  Successfully downloaded {model_file}", Colors.GREEN)
            except Exception as e:
                print_colored(f"  Failed to download {model_file}: {str(e)}", Colors.RED)
    else:
        print_colored("TensorFlow.js models already exist", Colors.GREEN)
    
    print_colored("JavaScript model download completed", Colors.GREEN)

def main():
    """Main function to run the application setup and startup"""
    # Set working directory to script location
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print_header("Driver Drowsiness and Emotion Monitoring System")
    
    # Check for Node.js
    if not check_command_exists("node"):
        print_colored("ERROR: Node.js is not installed or not in PATH", Colors.RED)
        print_colored("Please install Node.js 18.x or later from https://nodejs.org/", Colors.RED)
        input("Press Enter to exit...")
        sys.exit(1)

    # Check Node.js version
    result = subprocess.run("node -v", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    node_version = result.stdout.strip()
    print_colored(f"Node.js {node_version} detected", Colors.GREEN)
    
    # Check for Python
    python_available = False
    if check_command_exists("python"):
        # Get Python version
        result = subprocess.run("python -c \"import sys; print('.'.join(map(str, sys.version_info[:3])))\"", 
                               shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        python_version = result.stdout.strip()
        print_colored(f"Python {python_version} detected", Colors.GREEN)
        
        # Check Python version >= 3.8
        result = subprocess.run("python -c \"import sys; print(sys.version_info >= (3, 8))\"", 
                               shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if "True" in result.stdout:
            python_available = True
        else:
            print_colored("WARNING: Python version is less than 3.8", Colors.YELLOW)
            print_colored("The backend API server requires Python 3.8 or later", Colors.YELLOW)
            print_colored("You can still use the frontend with browser-based detection", Colors.YELLOW)
    else:
        print_colored("WARNING: Python is not installed or not in PATH", Colors.YELLOW)
        print_colored("The backend API server requires Python 3.8 or later", Colors.YELLOW)
        print_colored("You can still use the frontend with browser-based detection", Colors.YELLOW)
    
    # Check for package manager (pnpm or npm)
    if check_command_exists("pnpm"):
        package_manager = "pnpm"
    else:
        print_colored("pnpm not found, using npm instead...", Colors.YELLOW)
        package_manager = "npm"
    
    print_colored(f"Using {package_manager} as package manager", Colors.CYAN)
    print()
    
    # Create .env.local file if it doesn't exist
    env_file = Path("new_project") / ".env.local"
    if not env_file.exists():
        print_colored("Creating .env.local file...", Colors.YELLOW)
        env_file.parent.mkdir(exist_ok=True)
        with open(env_file, "w") as f:
            f.write("NEXT_PUBLIC_API_URL=/api\n")
        print_colored("Created .env.local with API URL configuration", Colors.GREEN)
    
    # Download JavaScript browser-based detection models
    download_javascript_models()
    
    # Install frontend dependencies if needed
    node_modules = Path("new_project") / "node_modules"
    if not node_modules.exists():
        print_colored("Node modules not found. Installing dependencies...", Colors.YELLOW)
        
        result = run_command(f"{package_manager} install", cwd="new_project", check=False)
        
        if result != 0:
            print()
            print_colored("ERROR: Failed to install dependencies", Colors.RED)
            print()
            print_colored("Trying to fix common issues...", Colors.YELLOW)
            print()
            
            if package_manager == "npm":
                print_colored("Clearing npm cache...", Colors.YELLOW)
                run_command("npm cache clean --force", cwd="new_project", check=False)
                
                print_colored("Attempting to install dependencies again...", Colors.YELLOW)
                result = run_command("npm install", cwd="new_project", check=False)
                
                if result != 0:
                    print()
                    print_colored("ERROR: Installation failed again. Please try manually:", Colors.RED)
                    print_colored("1. cd new_project", Colors.CYAN)
                    print_colored("2. npm cache clean --force", Colors.CYAN)
                    print_colored("3. del package-lock.json", Colors.CYAN)
                    print_colored("4. npm install", Colors.CYAN)
                    input("Press Enter to exit...")
                    sys.exit(1)
            else:
                print_colored("Clearing pnpm store...", Colors.YELLOW)
                run_command("pnpm store prune", check=False)
                
                print_colored("Attempting to install dependencies again...", Colors.YELLOW)
                result = run_command("pnpm install", cwd="new_project", check=False)
                
                if result != 0:
                    print()
                    print_colored("ERROR: Installation failed again. Please try manually:", Colors.RED)
                    print_colored("1. cd new_project", Colors.CYAN)
                    print_colored("2. pnpm store prune", Colors.CYAN)
                    print_colored("3. del pnpm-lock.yaml", Colors.CYAN)
                    print_colored("4. pnpm install", Colors.CYAN)
                    input("Press Enter to exit...")
                    sys.exit(1)
        
        print_colored("Dependencies installed successfully", Colors.GREEN)
        print()
    
    # Set up Python environment if Python is available
    if python_available:
        print_colored("Checking Python backend dependencies...", Colors.YELLOW)
        
        # Check if Python virtual environment exists
        use_venv = False
        venv_path = Path("venv")
        
        if not venv_path.exists():
            print_colored("Creating Python virtual environment...", Colors.YELLOW)
            result = run_command("python -m venv venv", check=False)
            
            if result != 0:
                print_colored("WARNING: Failed to create virtual environment", Colors.YELLOW)
                print_colored("Will attempt to install dependencies globally", Colors.YELLOW)
            else:
                use_venv = True
        else:
            use_venv = True
        
        # Activate virtual environment or proceed without it
        if use_venv:
            print_colored("Activating virtual environment...", Colors.YELLOW)
            
            # Different activation based on OS
            if platform.system() == "Windows":
                activate_script = os.path.join("venv", "Scripts", "activate")
            else:
                activate_script = os.path.join("venv", "bin", "activate")
            
            # Create a new Python process with the virtual environment
            if platform.system() == "Windows":
                # Use subprocess to activate venv in a separate process
                os.environ["VIRTUAL_ENV"] = os.path.abspath("venv")
                os.environ["PATH"] = os.path.join(os.environ["VIRTUAL_ENV"], "Scripts") + os.pathsep + os.environ["PATH"]
            else:
                # Source activation in Unix systems
                activate_this = os.path.join("venv", "bin", "activate_this.py")
                if os.path.exists(activate_this):
                    with open(activate_this) as f:
                        exec(f.read(), {'__file__': activate_this})
            
            # Install dlib in the virtual environment
            install_dlib()
        else:
            # Install dlib globally
            install_dlib()
        
        # Install Python dependencies
        print_colored("Installing Python dependencies...", Colors.YELLOW)
        
        result = run_command("pip install -r requirements.txt", check=False)
        
        if result != 0:
            print_colored("WARNING: Failed to install Python requirements", Colors.YELLOW)
            print_colored("You can still use the frontend with browser-based detection", Colors.YELLOW)
        else:
            print_colored("Python dependencies installed successfully", Colors.GREEN)
        
        # Install API-specific requirements
        api_requirements = Path("api_requirements.txt")
        if api_requirements.exists():
            print_colored("Installing flask-cors...", Colors.YELLOW)
            run_command("pip install flask-cors", check=False)
            
            print_colored("Installing API requirements (except dlib which was installed separately)...", Colors.YELLOW)
            
            # Read requirements file and install each package except dlib
            with open(api_requirements, "r") as f:
                for line in f:
                    if "dlib" not in line:
                        package = line.strip()
                        if package:
                            run_command(f"pip install {package}", check=False)
        
        # Download required model files if needed
        shape_predictor_script = Path("download_shape_predictor.py")
        if shape_predictor_script.exists():
            print_colored("Checking for required model files...", Colors.YELLOW)
            shape_predictor_file = Path("shape_predictor_68_face_landmarks.dat")
            
            if not shape_predictor_file.exists():
                print_colored("Downloading shape predictor model...", Colors.YELLOW)
                result = run_command("python download_shape_predictor.py", check=False)
            else:
                print_colored("Shape predictor model already exists", Colors.GREEN)
        
        print()
        print_colored("Python backend setup completed", Colors.GREEN)
        print()
    
    print_header("Starting Driver Drowsiness Monitoring System")
    print_colored("The application will be starting shortly...", Colors.CYAN)
    print()
    
    # Start Python API server if available
    api_server_process = None
    if python_available:
        print_colored("Starting Python API server...", Colors.YELLOW)
        
        # Start the API server in a separate process
        cmd = "python api_server.py"
        if platform.system() == "Windows":
            if use_venv:
                api_server_process = subprocess.Popen(
                    ["start", "cmd", "/k", f"cd {os.getcwd()} && .\\venv\\Scripts\\activate && {cmd}"],
                    shell=True
                )
            else:
                api_server_process = subprocess.Popen(
                    ["start", "cmd", "/k", f"cd {os.getcwd()} && {cmd}"],
                    shell=True
                )
        else:
            # Unix-like systems
            if use_venv:
                activate_cmd = f"source {os.path.join('venv', 'bin', 'activate')}"
                api_server_process = subprocess.Popen(
                    f"{activate_cmd} && {cmd}", shell=True, 
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
            else:
                api_server_process = subprocess.Popen(
                    cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
        
        # Wait a bit for the API server to start
        print_colored("Waiting for API server to initialize...", Colors.YELLOW)
        time.sleep(5)
        
        print_colored("Python API server started", Colors.GREEN)
    else:
        print_colored("Skipping Python API server (not available)", Colors.YELLOW)
        print_colored("Using browser-based detection only", Colors.YELLOW)
    
    print()
    print_colored("Starting Next.js frontend...", Colors.YELLOW)
    print_colored("Once started, you can access the application at: http://localhost:3000", Colors.CYAN)
    print()
    print_colored("Press Ctrl+C to stop the frontend when finished", Colors.CYAN)
    
    if python_available:
        print_colored("If the Python backend is running, close its window manually", Colors.CYAN)
    
    print("=" * 50)
    print()
    
    # Start Next.js application
    os.chdir("new_project")
    if package_manager == "npm":
        os.system("npm run dev")
    else:
        os.system("pnpm dev")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print_colored("Shutting down...", Colors.CYAN)
        print_colored("Don't forget to close any backend server windows that may be running", Colors.YELLOW)
        sys.exit(0) 
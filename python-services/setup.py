# python-services/setup.py
# Setup script for Python verification services

import subprocess
import sys
import os

def install_requirements():
    """Install Python requirements step by step"""
    print("🔧 Installing Python requirements...")
    
    # First upgrade pip
    try:
        print("📦 Upgrading pip...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--upgrade', 'pip'])
        print("✅ Pip upgraded successfully")
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Pip upgrade warning: {e}")
    
    # Install basic requirements first
    try:
        print("📦 Installing basic requirements...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ Basic requirements installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install basic requirements: {e}")
        return False
    
    # Install InsightFace with special handling
    try:
        print("📦 Installing ONNX Runtime...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'onnxruntime==1.16.3'])
        
        print("📦 Installing InsightFace...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'insightface', '--no-deps'])
        
        # Install InsightFace dependencies manually
        print("📦 Installing InsightFace dependencies...")
        insightface_deps = [
            'opencv-python',
            'numpy',
            'matplotlib',
            'Pillow',
            'albumentations',
            'prettytable'
        ]
        
        for dep in insightface_deps:
            try:
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', dep])
                print(f"✅ Installed {dep}")
            except subprocess.CalledProcessError:
                print(f"⚠️ Warning: Could not install {dep}")
        
        print("✅ InsightFace installation completed")
        
    except subprocess.CalledProcessError as e:
        print(f"⚠️ InsightFace installation failed: {e}")
        print("💡 You can try installing manually later with:")
        print("   pip install onnxruntime")
        print("   pip install insightface --no-deps")
    
    return True

def setup_environment():
    """Setup environment variables"""
    print("🔧 Setting up environment...")
    
    # Create .env file if it doesn't exist
    env_file = '.env'
    if not os.path.exists(env_file):
        with open(env_file, 'w') as f:
            f.write("# Python Verification Services Environment\n")
            f.write("FACE_SERVICE_PORT=8001\n")
            f.write("VOICE_SERVICE_PORT=8003\n")
            f.write("LOG_LEVEL=INFO\n")
        print("✅ Environment file created")
    else:
        print("✅ Environment file already exists")

def main():
    """Main setup function"""
    print("🚀 Setting up Python Verification Services...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        return False
    
    print(f"✅ Python version: {sys.version}")
    
    # Install requirements
    if not install_requirements():
        return False
    
    # Setup environment
    setup_environment()
    
    print("\n🎉 Setup complete!")
    print("\nTo start the services:")
    print("1. Face Service: python face_service.py")
    print("2. Voice Service: python voice_service.py")
    print("\nOr use the start script: python start_services.py")
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

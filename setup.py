import os
import sys
import subprocess
import shutil

def run_command(command, sudo=False):
    """
    Executes a shell command. Prepends sudo if required and available.
    """
    if sudo and shutil.which("sudo"):
        command = f"sudo {command}"

    print(f"--> Executing: {command}")
    return subprocess.run(command, shell=True)

def setup_environment():
    """
    Sets up the Ruby environment, installs bundler, and gems.
    """
    # Detect if we should use sudo (Unix-like systems only)
    use_sudo = False
    if os.name != 'nt':
        try:
            # Check if current user is root
            use_sudo = os.getuid() != 0
        except AttributeError:
            pass

    # 1. Install bundler
    bundler_install = run_command("gem install bundler", sudo=use_sudo)
    if bundler_install.returncode != 0:
        print("Note: bundler installation command returned non-zero. Continuing...")

    # 2. Configure local path and install gems
    if subprocess.run("bundle config set --local path .vendor/bundle", shell=True).returncode == 0:
        run_command("bundle install")
    else:
        print("Failed to set bundle config.")
        sys.exit(1)

    print("\nSetup successful!")

def start_jekyll_server():
    """
    Start the Jekyll development server.
    """
    try:
        print("Starting Jekyll server (Ctrl+C to stop)...")
        subprocess.run("bundle exec jekyll serve", shell=True, check=True)

    except KeyboardInterrupt:
        print("\nStopping Jekyll server...")
        pass
    except subprocess.CalledProcessError as e:
        print(f"\nCommand failed: {e.cmd}\nExit code: {e.returncode}")
    except Exception as e:
        print(f"\nUnable to start the Jekyll server: {e}")

if __name__ == "__main__":
    setup_environment()
    start_jekyll_server()

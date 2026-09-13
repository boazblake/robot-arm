{
  description = "LiftMate iOS Dev Shell (Ionic + Capacitor)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        geminiScript = pkgs.writeScriptBin "gemini" ''
          #!/bin/sh
          exec ${pkgs.nodejs_24}/bin/npx --prefix $PWD @google/gemini-cli "$@"
        '';

        darwinTools = pkgs.lib.optionals pkgs.stdenv.isDarwin [
          pkgs.ruby_3_1
          pkgs.bundler
          pkgs.cocoapods
          pkgs.libiconv
        ];

      in {
        devShells.default = pkgs.mkShellNoCC {
          buildInputs = [
            pkgs.nodejs_24
            pkgs.typescript
            pkgs.mkcert
            pkgs.nodePackages.npm
            pkgs.git
            geminiScript
          ] ++ darwinTools;

          shellHook = ''
            export NODE_ENV=development
            export CC=/usr/bin/clang
            export CXX=/usr/bin/clang++
            export DEVELOPER_DIR="$(xcode-select -p)"
            export SDKROOT=$(xcrun --sdk iphoneos --show-sdk-path)
            export PATH=$(echo "$PATH" | tr ':' '\n' | grep -v '/nix/store/.*/clang' | tr '\n' ':')

            echo "Using Clang: $(clang --version | head -n 1)"

            export CAPACITOR_ANDROID_STUDIO_PATH="$ANDROID_HOME/studio/bin/studio"

            echo "NOTE: This shell expects Apple Clang."
            if ! clang --version 2>/dev/null | grep -q "Apple clang"; then
              echo "WARNING: Not using Apple clang. Run this with: nix develop --impure"
            fi

            if [ ! -d "node_modules" ]; then
              echo "Installing npm dependencies..."
              npm install
            fi

            if [ ! -f ".cert/cert.pem" ]; then
              echo "Generating local SSL certs..."
              node --run make:certs
            fi

            # Create config directory if it doesn't exist
            mkdir -p ~/.config/gemini-cli

            # Set up default configuration
            if [ ! -f ~/.config/gemini-cli/config.json ]; then
              echo "Creating default Gemini CLI configuration..."
              cat > ~/.config/gemini-cli/config.json << EOL
            {
              "user": {
                "name": "Boaz Blake",
                "email": "boazblake@gmail.com"
              },
              "default_project": "liftmate-dev",
              "location": "Houston, TX"
            }
            EOL
            fi

            # Check if already authenticated
            if [ ! -f ~/.config/gemini-cli/credentials.json ]; then
              echo "Please authenticate with Gemini CLI:"
              echo "Run 'gemini auth login' to set up your authentication"
            else
              echo "Gemini CLI authentication found"
            fi

            echo "Dev shell ready. Common commands:"
            echo "  node --run startweb      # Run web dev build"
            echo "  node --run startios      # Build and run iOS"
            echo "  gemini                   # Run Gemini CLI"
            echo "  gemini auth login        # Authenticate with Gemini"
            echo "  gemini config show       # Show current configuration"
          '';
        };
      }
    );
}

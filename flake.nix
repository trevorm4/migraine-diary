{
  description = "migraine-diary - Tauri 2 desktop app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Libraries the built binary needs at runtime.
        runtimeDeps = with pkgs; [
          webkitgtk_4_1
          gtk3
          libsoup_3
          glib
          cairo
          gdk-pixbuf
          pango
          atk
          dbus
          openssl
          libGL
          vulkan-loader
          libxkbcommon
          wayland
          fontconfig
          gsettings-desktop-schemas
        ];

        # Libraries tauri-build needs to find via pkg-config.
        pkgConfigDirs = with pkgs; [
          webkitgtk_4_1
          gtk3
          libsoup_3
          glib.dev
          cairo.dev
          gdk-pixbuf
          pango.dev
          atk
          dbus
          openssl.dev
        ];

        desktopItem = pkgs.makeDesktopItem {
          name = "migraine-diary";
          exec = "migraine-diary";
          icon = "migraine-diary";
          comment = "Migraine diary and pain tracker";
          desktopName = "Migraine Diary";
          categories = [ "Office" "Utility" ];
          terminal = false;
        };

        # Frontend source only (no Rust, no node_modules, no dist).
        frontendSrc = pkgs.lib.cleanSourceWith {
          src = pkgs.lib.cleanSource ./.;
          filter = path: type:
            type == "directory"
            || baseNameOf path == "package.json"
            || baseNameOf path == "bun.lock"
            || baseNameOf path == "pnpm-workspace.yaml"
            || baseNameOf path == "tsconfig.json"
            || baseNameOf path == "tsconfig.node.json"
            || baseNameOf path == "vite.config.ts"
            || baseNameOf path == "postcss.config.cjs"
            || baseNameOf path == "index.html";
        };

        # `bun install` needs network; run it inside a fixed-output derivation so
        # the result is content-addressed and reproducible despite the fetch.
        nodeModules = pkgs.stdenv.mkDerivation {
          name = "migraine-diary-node-modules";
          src = frontendSrc;
          nativeBuildInputs = [ pkgs.bun ];
          outputHashMode = "recursive";
          outputHash = "sha256-gXv+6DJP5qOn1m/8kE14QgfVeGcgNbx2TXS4/e5ym94=";
          buildPhase = ''
            export HOME=$TMPDIR
            bun install --frozen-lockfile
          '';
          installPhase = ''
            cp -r node_modules $out
          '';
        };
      in
      {
        packages.default = pkgs.rustPlatform.buildRustPackage {
          pname = "migraine-diary";
          version = "0.1.0";
          src = pkgs.lib.cleanSource ./.;
          cargoLock.lockFile = ./src-tauri/Cargo.lock;
          cargoRoot = "src-tauri";
          buildAndTestSubdir = "src-tauri";
          # tauri.conf.json embeds ../dist (repo root) at Rust build time, so
          # build the frontend first, inside the source tree.
          preConfigure = ''
            cp -r ${nodeModules} ./node_modules
            chmod -R u+w ./node_modules
            export HOME=$TMPDIR
            node node_modules/typescript/bin/tsc
            node node_modules/vite/bin/vite.js build
          '';
          nativeBuildInputs = with pkgs; [
            pkg-config
            makeWrapper
            copyDesktopItems
            bun
            nodejs
          ];
          buildInputs = runtimeDeps ++ pkgConfigDirs;
          desktopItems = [ desktopItem ];
          postFixup = ''
            wrapProgram $out/bin/migraine-diary \
              --prefix LD_LIBRARY_PATH : "${pkgs.lib.makeLibraryPath runtimeDeps}"
            install -Dm644 $src/src-tauri/icons/128x128.png \
              $out/share/icons/hicolor/128x128/apps/migraine-diary.png
          '';
          doCheck = false;
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            rustc
            cargo
            rustfmt
            clippy
            rust-analyzer
            appimage-run
            bun
            nodejs
          ];

          nativeBuildInputs = with pkgs; [
            pkg-config
            openssl
            glib
            gtk3
            libsoup_3
            webkitgtk_4_1
            cairo
            gdk-pixbuf
            pango
            atk
          ];

          buildInputs = with pkgs; [
            openssl
            glib
            gtk3
            libsoup_3
            webkitgtk_4_1
            cairo
            gdk-pixbuf
            pango
            atk
            dbus
            glibc
          ];

          shellHook = ''
            export WEBKIT_DISABLE_COMPOSITING_MODE=1
            export LD_LIBRARY_PATH="${
              pkgs.lib.makeLibraryPath [
                pkgs.webkitgtk_4_1
                pkgs.gtk3
                pkgs.libsoup_3
                pkgs.glib
                pkgs.cairo
                pkgs.gdk-pixbuf
                pkgs.pango
                pkgs.atk
                pkgs.dbus
              ]
            }"
            echo "migraine-diary dev shell ready."
          '';
        };
      });
}

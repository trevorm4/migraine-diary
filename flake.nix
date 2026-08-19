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
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            # Rust toolchain (managed via rustup)
            rustc
            cargo
            rustfmt
            clippy
            rust-analyzer

            # AppImage bundling
            appimage-run

            # JS toolchain
            bun
            nodejs
          ];

          # Tauri v2 on Linux needs these pkg-config paths at build time.
          # `nativeBuildInputs` are what expose their `.pc` files via
          # PKG_CONFIG_PATH inside the shell.
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

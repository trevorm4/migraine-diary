# migraine-diary

A desktop app for tracking migraine episodes, built with [Tauri 2](https://tauri.app/) and [React](https://react.dev).

## Features

- Log migraine entries with severity, dates, duration, and notes.
- Select one or more headache sections (e.g. Temple, Forehead, Front).
- Track medication use per entry, with optional dose amount.
- View a history of past entries and edit them.
- Dashboard with stats and charts (including medication use and primary headache section).

## Getting started

### Prerequisites (Nix)

A Nix Flakes-enabled Nix installation.

```sh
nix develop
```

### Development

Inside `nix develop`:

```sh
bun tauri dev
```

### Build

```sh
# Build a bundled app with Nix
nix build .#default
```

## License

MIT

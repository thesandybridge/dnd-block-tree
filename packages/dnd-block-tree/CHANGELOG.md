# Changelog

## 0.3.0

### Features

- **Mobile & touch support** - Separate activation constraints for touch vs pointer sensors. Touch uses a 200ms delay-based activation to prevent interference with scrolling, while pointer (mouse) continues using distance-based activation.
- **Overflow prevention** - Added `minWidth: 0` and `touchAction: 'none'` to tree containers and draggable blocks, preventing horizontal overflow on narrow/mobile viewports.

### Fixes

- Fixed touch drag interfering with page scrolling on mobile devices
- Fixed tree content overflowing container bounds on small screens

## 0.2.0

### Features

- **Stable drop zones** - Zones render based on original block positions, not preview state, ensuring consistent drop targets during drag
- **Ghost preview** - Semi-transparent preview shows where blocks will land without affecting zone positions
- **Depth-aware collision** - Smart algorithm prefers nested zones when cursor is at indented levels, with hysteresis to prevent flickering

### Fixes

- Fixed flickering between adjacent drop zones
- Fixed items disappearing when dragging near container boundaries
- Fixed end-zone handling for nested containers
- Fixed `extractUUID` to handle `end-` prefix

## 0.1.2

### Fixes

- CI fixes for root package-lock.json

## 0.1.0

- Initial release

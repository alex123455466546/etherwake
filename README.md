# Etherwake

A top-down space survival game. Build a ship from blocks, harvest a living ether from rocks, wrecks and open space, and decide which systems get power when it runs low. The ether shifts mood with what you are doing, and waves of pirates arrive from the dark.

## Play

Download the latest version from the **Releases** page on the right.

- **Windows app:** download `Etherwake.exe` and run it. It is one file with the soundtrack inside. It opens in its own window, and <kbd>F11</kbd> goes fullscreen.
- **In a browser:** download the zip, unpack it, and open `Etherwake.html`. Keep the `music` folder next to it for the soundtrack. It works offline.

It needs a keyboard and mouse. Progress and settings save automatically. The controls are in the game: press <kbd>Esc</kbd>, then Guide.

**First run on Windows:** the exe is not code-signed, so Windows SmartScreen may say "Windows protected your PC". Click **More info**, then **Run anyway**. The app uses Microsoft Edge WebView2, which comes with Windows 10 and 11.

Saves for the Windows app live in `%LOCALAPPDATA%\Etherwake`. To remove the game completely, delete the exe and that folder.

## Building it yourself

You need Node.js. The game is plain JavaScript in `src/`, and one command joins it into a single page:

```
npm install
node tools/build.mjs --release
```

That writes `dist/Etherwake.html` and `dist/music/spaceify.webm`.

For the Windows app you also need Visual Studio 2022 or later, or the free Build Tools, with the **Desktop development with C++** workload. Then run:

```
powershell -ExecutionPolicy Bypass -File desktop\build.ps1
```

The result is `desktop\build\Etherwake.exe`. The script downloads Microsoft's WebView2 SDK from NuGet the first time, at a pinned version checked against its SHA-256.

## Licences

The game is © Alex's Studio, all rights reserved (see `LICENSE`). The soundtrack, "Spaceify", was made for Etherwake. The game font is Atkinson Hyperlegible by the Braille Institute of America, under the SIL Open Font License (`licenses/Atkinson-Hyperlegible-OFL.txt`).

Designed by Alex's Studio.

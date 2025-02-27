---
title: Making Minecraft mods on NixOS
description: 'A definitive guide on how to set up your dev environment to make Minecraft mods on NixOS.'
pubDate: 'Aug 25 2024'
heroImage: './assets/blog-placeholder-3.jpg'
category: Programming
tags:
  - Java
  - Minecraft
---

# Intro
I've been making Minecraft mods (and plugins!) for a while (for around 4 years!) now 
and about 2 years ago I started using NixOS as my main Linux distro.

# So... what's the problem?
When running the beloved "Minecraft Client" task I was met with an unpleasant surprise. That being a GL error.

Here are some of them:
- `java.lang.IllegalStateException: Failed to initialize GLFW, errors: GLFW error during init: [0x1000E]*a bunch of numbers*`
- `java.lang.UnsatisfiedLinkError: Failed to locate library: libGL.so.1`
- *(maybe more that I couldn't find)*

## Basic Setup
I got a good ol' flake.nix

```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    systems.url = "github:nix-systems/default";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      systems = import inputs.systems;
      perSystem = { config, self', pkgs, lib, system, ... }: {
      devShells.default = pkgs.mkShell {
        buildInpts = with pkgs; [
          zulu17
        ];
        LD_LIBRARY_PATH = with pkgs; lib.makeLibraryPath [
          libGL
          glfw
          openal
          flite
          libpulseaudio
          udev
          xorg.libXcursor
        ];
      };
    };
  };
}
```

and direnv (`.envrc`)

```
use flake
```

That worked. Until it didn't.

That allowed me to start the game via terminal and `./gradlew runClient`.
Which worked, but wasn't ideal since I wanted to utilize IntelliJ IDEA's hotreload and debugging tools!


## The REAL way of fixing it

After some experimentation I came up with this flake:

```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    systems.url = "github:nix-systems/default";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      systems = import inputs.systems;
      perSystem = { config, self', pkgs, lib, system, ... }: let
        libs = with pkgs; [
          # GL
          libGL
          glfw-wayland-minecraft

          # audio
          libpulseaudio
          openal

          # flite <- uncomment to get TTS
        ];
        jbr = pkgs.callPackage ./scripts/jbr.nix {};
      in {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            jbr
          ];

          buildInputs = libs;
          LD_LIBRARY_PATH = lib.makeLibraryPath libs;

          env = {
           JAVA_HOME = "${jbr}/lib/openjdk/";
          };
        };
      };
    };
}
```

As you see I use a special Java package. I use JBR (JetBrains Runtime) as it has DCEVM with good debug capabilities (hot reload).

Here's the said package's content, which was copied from nix-pkgs:

```nix
{ lib
, stdenv
, fetchFromGitHub
, jetbrains
, openjdk17
, openjdk17-bootstrap
, git
, autoconf
, unzip
, rsync

, libXdamage
, libXxf86vm
, libXrandr
, libXi
, libXcursor
, libXrender
, libX11
, libXext
, libxcb
, nss
, nspr
, libdrm
, mesa
, wayland
, udev
}:

let
  arch = {
    "aarch64-linux" = "aarch64";
    "x86_64-linux" = "x64";
  }.${stdenv.hostPlatform.system} or (throw "Unsupported system: ${stdenv.hostPlatform.system}");
  cpu = stdenv.hostPlatform.parsed.cpu.name;
in
openjdk17.overrideAttrs (oldAttrs: rec {
  pname = "jetbrains-jdk";
  javaVersion = "17.0.11";
  build = "1207.24";
  # To get the new tag:
  # git clone https://github.com/jetbrains/jetbrainsruntime
  # cd jetbrainsruntime
  # git reset --hard [revision]
  # git log --simplify-by-decoration --decorate=short --pretty=short | grep "jbr-" --color=never | cut -d "(" -f2 | cut -d ")" -f1 | awk '{print $2}' | sort -t "-" -k 2 -g | tail -n 1 | tr -d ","
  openjdkTag = "jbr-17.0.8+7";
  version = "${javaVersion}-b${build}";

  src = fetchFromGitHub {
    owner = "JetBrains";
    repo = "JetBrainsRuntime";
    rev = "jb${version}";
    hash = "sha256-a7cJF2iCW/1GK0/GmVbaY5pYcn3YtZy5ngFkyAGRhu0=";
  };

  BOOT_JDK = openjdk17-bootstrap.home;
  # run `git log -1 --pretty=%ct` in jdk repo for new value on update
  SOURCE_DATE_EPOCH = 1715809405;

  patches = [ ];

  dontConfigure = true;

  buildPhase = ''
    runHook preBuild

    sed \
        -e "s/OPENJDK_TAG=.*/OPENJDK_TAG=${openjdkTag}/" \
        -e "s/SOURCE_DATE_EPOCH=.*//" \
        -e "s/export SOURCE_DATE_EPOCH//" \
        -i jb/project/tools/common/scripts/common.sh
    sed -i "s/STATIC_CONF_ARGS/STATIC_CONF_ARGS \$configureFlags/" jb/project/tools/linux/scripts/mkimages_${arch}.sh
    sed \
        -e "s/create_image_bundle \"jb/#/" \
        -e "s/echo Creating /exit 0 #/" \
        -i jb/project/tools/linux/scripts/mkimages_${arch}.sh

    patchShebangs .
    ./jb/project/tools/linux/scripts/mkimages_${arch}.sh ${build} nomod

    runHook postBuild
  '';

  installPhase =
    let
      buildType = "release";
      jbrsdkDir = "jbrsdk-${javaVersion}-linux-${arch}-b${build}";
    in
    ''
      runHook preInstall

      mv build/linux-${cpu}-server-${buildType}/images/jdk/man build/linux-${cpu}-server-${buildType}/images/${jbrsdkDir}
      rm -rf build/linux-${cpu}-server-${buildType}/images/jdk
      mv build/linux-${cpu}-server-${buildType}/images/${jbrsdkDir} build/linux-${cpu}-server-${buildType}/images/jdk
    '' + oldAttrs.installPhase + "runHook postInstall";

  dontStrip = false;

  postFixup = ''
    # Build the set of output library directories to rpath against
    LIBDIRS="${lib.makeLibraryPath [
      libXdamage libXxf86vm libXrandr libXi libXcursor libXrender libX11 libXext libxcb
      nss nspr libdrm mesa wayland udev
    ]}"
    for output in $outputs; do
      if [ "$output" = debug ]; then continue; fi
      LIBDIRS="$(find $(eval echo \$$output) -name \*.so\* -exec dirname {} \+ | sort -u | tr '\n' ':'):$LIBDIRS"
    done
    # Add the local library paths to remove dependencies on the bootstrap
    for output in $outputs; do
      if [ "$output" = debug ]; then continue; fi
      OUTPUTDIR=$(eval echo \$$output)
      BINLIBS=$(find $OUTPUTDIR/bin/ -type f; find $OUTPUTDIR -name \*.so\*)
      echo "$BINLIBS" | while read i; do
        patchelf --set-rpath "$LIBDIRS:$(patchelf --print-rpath "$i")" "$i" || true
        patchelf --shrink-rpath "$i" || true
      done
    done
  '';

  nativeBuildInputs = [ git autoconf unzip rsync ] ++ oldAttrs.nativeBuildInputs;

  meta = with lib; {
    description = "An OpenJDK fork to better support Jetbrains's products.";
    longDescription = ''
      JetBrains Runtime is a runtime environment for running IntelliJ Platform
      based products on Windows, Mac OS X, and Linux. JetBrains Runtime is
      based on OpenJDK project with some modifications. These modifications
      include: Subpixel Anti-Aliasing, enhanced font rendering on Linux, HiDPI
      support, ligatures, some fixes for native crashes not presented in
      official build, and other small enhancements.
      JetBrains Runtime is not a certified build of OpenJDK. Please, use at
      your own risk.
    '';
    homepage = "https://confluence.jetbrains.com/display/JBR/JetBrains+Runtime";
    inherit (openjdk17.meta) license platforms mainProgram;
    maintainers = with maintainers; [ edwtjo ];

    broken = stdenv.isDarwin;
  };

  passthru = oldAttrs.passthru // {
    home = "${jetbrains.jdk}/lib/openjdk";
  };
})
```

To finish the set up, open `File > Settings > Build System > Gradle`. You'll see a fiel, where you can choose java installation. 
Make sure to choose `JAVA_HOME`, which was set by the flake automatically.

When opening the project, run IntelliJ from terminal while in the dev environment. This will make sure that the environment variables are properly passed on.

All of this will work to just double click `:runClient` in the Gradle tab and voila!

However, if you want to run the "Minecraft Client" run configration, provided by Fabric Loom or Forge Gradle, you'd need to set your Java installation accordinly in `File > Project Settings > SDKs`.


# Outro

I hope this guide helps someone to set up a proper modding dev environment on NixOS and they don't have to waste time, the most useful resource, on writing mods without hot reload.
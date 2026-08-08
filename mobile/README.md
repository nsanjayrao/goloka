# Goloka on Android

`mobile/twa/` is the Android app. It is a **Trusted Web Activity** (TWA): a
thin native shell whose entire job is to open `https://goloka-three.vercel.app`
in Chrome's engine, full screen, with no address bar.

There is no second codebase here. The app *is* the website, so:

- **Content and design changes ship instantly**, with no rebuild and no store
  review. Push to `main`, Vercel deploys, the app shows it on next open.
- Sign-in, `localStorage`, Continue Watching and **web push all keep working
  unchanged** — a TWA shares Chrome's storage, so the app and the browser are
  the same session. No FCM account was needed.
- You only rebuild the APK when something in `web/public/manifest.json`
  changes (name, icons, theme colour, shortcuts) or to raise the version.

## The keystore: the one thing that cannot be replaced

`mobile/twa/android.keystore` holds the private key that signs the APK.
Android refuses to install an update signed with a different key, so **if this
file or its password is lost, everyone who installed the app is stranded on
the version they have, permanently.** There is no recovery and no reset.

It is gitignored (`.gitignore` covers `*.keystore`). Keep a copy of the file
**and** its two passwords somewhere durable — a password manager, not this
repo, not a chat log.

Create it once:

```powershell
cd mobile/twa
& "$env:USERPROFILE\.bubblewrap\jdk\jdk-17.0.20+8\bin\keytool.exe" `
  -genkeypair -v `
  -keystore android.keystore `
  -alias goloka `
  -keyalg RSA -keysize 4096 -validity 10950 `
  -dname "CN=Goloka, O=Goloka, C=IN"
```

It prompts for a password **twice** — once to set it, once to confirm — and
nothing echoes as you type, not even asterisks. There is no separate "key
password": JDK 17 creates PKCS12 keystores, where the key password must equal
the store password, so keytool does not ask. One password is all there is.

10950 days is 30 years — deliberately longer than any plausible life of the
project, because an expired signing key has the same effect as a lost one.

## Building

```powershell
cd mobile/twa
bubblewrap build          # asks for the keystore password, then the key
                          # password - give it the SAME one both times
```

This produces, in `mobile/twa/`:

- `app-release-signed.apk` — the sideloadable file, for a GitHub Release
- `app-release-bundle.aab` — the Play Store format, if that ever happens

To build without the interactive prompts (CI, or repeat builds), set
`BUBBLEWRAP_KEYSTORE_PASSWORD` and `BUBBLEWRAP_KEY_PASSWORD` in the
environment first.

To compile without signing — useful to check the toolchain still works:

```powershell
cd mobile/twa
$env:JAVA_HOME="$env:USERPROFILE\.bubblewrap\jdk\jdk-17.0.20+8"
$env:ANDROID_HOME="C:\Users\NSANJA~1\BUBBLE~1\ANDROI~1"
./gradlew.bat assembleRelease --no-daemon
```

## Digital Asset Links — what removes the address bar

A TWA only drops the URL bar if the site vouches for the app. That proof is
`web/public/.well-known/assetlinks.json`, which lists the SHA-256 fingerprint
of the signing certificate. Chrome fetches it at launch; if it does not match,
the app still works but shows a Custom Tab **with an address bar** — that is
the single symptom to look for, and the only thing worth testing first.

Read the fingerprint out of a signed APK (no keystore password needed):

```powershell
& "C:\Users\NSANJA~1\BUBBLE~1\ANDROI~1\build-tools\36.1.0\apksigner.bat" `
  verify --print-certs mobile/twa/app-release-signed.apk
```

Take the `SHA-256` line, uppercase with colons, into
`web/public/.well-known/assetlinks.json`, then deploy the site. Verify it is
live and well-formed before installing:

```
https://goloka-three.vercel.app/.well-known/assetlinks.json
```

Note the ordering trap: the fingerprint comes from the signed APK, so the
first build necessarily happens *before* assetlinks exists. That first APK
will show an address bar until the site is deployed with the fingerprint —
this is expected, and no rebuild is needed to fix it, only a deploy.

## Releasing a new version

1. Bump `appVersionCode` (integer, must always increase) and `appVersionName`
   in `twa-manifest.json`. **Also bump the legacy `appVersion` field** — the
   generator prefers it for `versionName` and silently ignores
   `appVersionName` when the two disagree.
2. `bubblewrap update --skipVersionUpgrade` to regenerate the Android project.
3. `bubblewrap build`.
4. Attach `app-release-signed.apk` to a GitHub Release.

## Toolchain notes (read before reinstalling anything)

`bubblewrap doctor` reports the JDK and SDK paths from
`~/.bubblewrap/config.json`. Both were installed **by hand**, because
Bubblewrap's own installers do not work on this machine:

- **Its JDK installer is broken on Windows.** It requests
  `OpenJDK17U-jdk_x86-32_windows_hotspot_17.0.11_9.zip` — a 32-bit build
  Temurin never published — and falls back to unpacking the OpenJDK *source*
  tree (64,000 files, no `java.exe`). Temurin **17.0.20 x64** was installed
  manually to `~/.bubblewrap/jdk/` instead. Do not run
  `bubblewrap doctor` expecting it to fix a missing JDK; it will re-break it.
- **Its SDK path check predates the current SDK layout.** It requires
  `<sdk>/bin` or `<sdk>/tools`, while modern command-line tools live at
  `<sdk>/cmdline-tools/latest/bin`. `~/.bubblewrap/android_sdk/bin` and
  `/lib` are **directory junctions** pointing at `cmdline-tools/latest/`.
  Deleting them makes `doctor` fail again.
- **The paths in `config.json` are 8.3 short paths**
  (`C:\Users\NSANJA~1\BUBBLE~1\...`) on purpose. The real paths contain
  spaces, and Bubblewrap carries a known unfixed bug passing a spaced
  `--sdk_root` to the Android SDK. Do not "tidy" them into long paths.

Installed SDK packages: `build-tools;36.1.0` (the version Bubblewrap pins),
`platform-tools`, `platforms;android-36`.

## Why the package id is `app.goloka.android`

It is permanent. Android identifies an app by its package id, and on the Play
Store it can never be changed or reused — a different id is a different app,
with its own listing and no upgrade path for existing installs.

`app.goloka.android` was chosen betting on a future `goloka.app` domain. If a
custom domain is bought later, only the TWA's *origin* changes (a rebuild plus
new assetlinks); the package id stays, and existing installs upgrade cleanly.

## iPhone and iPad

There is no iOS project here, deliberately. iOS has no sideloading, so an
App Store build means a paid Apple Developer account, and a webview wrapper
risks rejection under App Store Guideline 4.2. Instead, iOS devotees install
the PWA from `/install` — Add to Home Screen gives a real home-screen app with
the correct icon, full screen, and (once installed) web push.

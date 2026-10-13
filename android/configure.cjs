'use strict';
const fs = require('node:fs');
const path = require('node:path');
const gradlePath = path.join(__dirname, 'android/app/build.gradle');
const resPath = path.join(__dirname, 'android/app/src/main/res');
const iconsPath = path.join(__dirname, 'launcher-icon');

for (const [density, size] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  const target = path.join(resPath, `mipmap-${density}`);
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(path.join(iconsPath, `icon-${size}.png`), path.join(target, 'ic_launcher.png'));
  fs.copyFileSync(path.join(iconsPath, `icon-round-${size}.png`), path.join(target, 'ic_launcher_round.png'));
}
const drawable = path.join(resPath, 'drawable-nodpi');
fs.mkdirSync(drawable, { recursive: true });
fs.copyFileSync(path.join(iconsPath, 'foreground.png'), path.join(drawable, 'ic_launcher_foreground.png'));
const adaptive = path.join(resPath, 'mipmap-anydpi-v26');
fs.mkdirSync(adaptive, { recursive: true });
const adaptiveIcon = `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@android:color/black" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;
for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  fs.writeFileSync(path.join(adaptive, name), adaptiveIcon);
}

const version = (process.env.GITHUB_REF_NAME || 'v0.9.8').replace(/^v/, '');
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
if (!match) throw new Error('Expected release tag vMAJOR.MINOR.PATCH');
const [major, minor, patch] = match.slice(1).map(Number);
if (major > 2000 || minor > 999 || patch > 999) throw new Error('Release version exceeds Android versionCode range');
const versionCode = major * 1000000 + minor * 1000 + patch;
let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);
gradle += `
android {
    signingConfigs {
        release {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias 'physics-ii'
            keyPassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
        }
    }
    buildTypes {
        release { signingConfig signingConfigs.release }
    }
}
`;
fs.writeFileSync(gradlePath, gradle);

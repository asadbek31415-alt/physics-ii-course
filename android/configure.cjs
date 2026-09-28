'use strict';
const fs = require('node:fs');
const path = require('node:path');
const gradlePath = path.join(__dirname, 'android/app/build.gradle');
const version = (process.env.GITHUB_REF_NAME || 'v0.9.5').replace(/^v/, '');
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

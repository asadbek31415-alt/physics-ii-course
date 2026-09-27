'use strict';
const fs = require('node:fs');
const path = require('node:path');
const gradlePath = path.join(__dirname, 'android/app/build.gradle');
const buildNumber = Number(process.env.GITHUB_RUN_NUMBER || 1);
if (!Number.isSafeInteger(buildNumber) || buildNumber < 1) throw new Error('Invalid build number');
let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${buildNumber}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "0.9.${buildNumber}"`);
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

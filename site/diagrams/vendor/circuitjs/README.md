# CircuitJS release runtime

CircuitJS is copyright its upstream contributors and distributed under GPL v2
or later. See COPYING.txt. The engine in the deployed website and APK is built
without source changes from revision 5a707168778216bb6ed01bfdd62e8bbf7ae0a032:
https://github.com/pfalstad/circuitjs1/tree/5a707168778216bb6ed01bfdd62e8bbf7ae0a032

The matching source, including its build files, is included next to this file
as circuitjs-source.tar.gz in the website and APK. Build using Java 17 and
Gradle 8.7 with `gradle makeSite --no-daemon --max-workers=2`.
The release repository's .github/actions/build-circuitjs/action.yml contains
the complete build and packaging steps. SHA256SUMS.txt records compiled files.

engine.html is the course's minimal host document. Course visualizations use
CircuitJS's public JavaScript interface. Third-party licenses remain applicable
independently of course content terms.

# Quizicle Frontend

React + Vite frontend for Quizicle.

## Android / Google Play Packaging
This project is configured with Capacitor and an Android wrapper.

### Included in repo
- Capacitor config: `capacitor.config.ts`
- Android project: `android/`
- App ID: `com.quizicle.app`
- App name: `Quizicle`

### After frontend changes
1. Build + sync web assets into Android:
   - `npm run cap:sync`
2. Open Android Studio:
   - `npm run android:open`

### Create Play Store bundle (.aab)
1. Open Android Studio (`npm run android:open`).
2. Go to `Build > Generate Signed Bundle / APK`.
3. Choose `Android App Bundle`.
4. Use your release keystore.
5. Build and upload the generated `.aab` to Google Play Console.

### Important
- If you change package name, update `appId` in `capacitor.config.ts` before first Play Store release.
- Use production HTTPS API URLs in `.env` for release builds.

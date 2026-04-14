# App Store & Google Play Compliance Checklist

**App:** XunShang (AI Smart Outfit Assistant)
**Bundle ID:** com.xuno.app
**Last Updated:** 2026-04-14

---

## 1. Data Collection Declaration

### Data Collected

| Data Type | Purpose | Storage | Encrypted | Deletable |
|-----------|---------|---------|-----------|-----------|
| Phone number | Account registration | PRC servers | AES-256 | Yes (account deletion) |
| Email address | Account registration, notifications | PRC servers | AES-256 | Yes |
| Nickname/Avatar | Profile display | PRC servers | No | Yes |
| Gender/Age range | Personalization | PRC servers | No | Yes |
| Body measurements | AI recommendation | PRC servers | AES-256 | Yes |
| User photos | Virtual try-on, body analysis | MinIO (PRC) | AES-256-GCM | Yes |
| Style preferences | AI recommendation | PRC servers | No | Yes |
| Device info | Analytics, crash reporting | Sentry (US) | TLS in transit | Partial (anon) |
| IP address | Security, analytics | PRC servers | No | On account deletion |
| Browsing history | Personalization | PRC servers | No | Yes (7-day purge) |
| Purchase history | Order management | PRC servers | AES-256 | No (legal requirement) |
| Push token | Push notifications | PRC servers | No | Yes (deregister) |
| Location (approximate) | Weather, local recommendations | PRC servers | No | Yes |

### Third-Party SDKs

| SDK | Purpose | Data Collected | Privacy Impact |
|-----|---------|---------------|----------------|
| Firebase (FCM) | Push notifications (Android) | Device token | Low - token only |
| APNs (Apple) | Push notifications (iOS) | Device token | Low - token only |
| Sentry | Crash reporting, performance | Device info, crash logs | Medium - anonymized |
| GLM API (Zhipu AI) | AI stylist, virtual try-on | Text input, images | High - see note |
| QWeather | Weather data | Location (approx) | Low - city-level |
| Alipay SDK | Payment processing | Payment token | Medium - PCI scope |
| WeChat Pay SDK | Payment processing | Payment token | Medium - PCI scope |

**GLM API Note:** User photos and text are sent to Zhipu AI's API for AI processing. Photos are used only for the requested service (virtual try-on, body analysis) and are not stored by the third party beyond processing time. Users are informed of this in the privacy policy.

---

## 2. Permission Usage Descriptions

### iOS (Info.plist)

| Permission | Key | Description (Chinese) | Description (English) |
|-----------|-----|----------------------|----------------------|
| Camera | NSCameraUsageDescription | XunShang needs camera access to take photos for virtual try-on and body analysis | XunShang needs camera access for virtual try-on and body analysis |
| Photo Library | NSPhotoLibraryUsageDescription | XunShang needs photo library access to select photos for virtual try-on and outfit sharing | XunShang needs photo library access for virtual try-on and sharing |
| Notifications | - | Receive order updates, style recommendations, and community interactions | Receive order updates, recommendations, and community notifications |
| Location | NSLocationWhenInUseUsageDescription | XunShang uses your location for weather-based outfit recommendations | XunShang uses location for weather-based recommendations |

### Android (AndroidManifest.xml)

| Permission | Purpose | Required |
|-----------|---------|----------|
| INTERNET | API communication | Yes |
| CAMERA | Photo capture for try-on | No |
| READ_EXTERNAL_STORAGE | Photo selection | No |
| POST_NOTIFICATIONS | Push notifications (Android 13+) | No |
| ACCESS_FINE_LOCATION | Weather-based recommendations | No |
| ACCESS_COARSE_LOCATION | Weather-based recommendations | No |

---

## 3. Age Rating Assessment

**App Store:** 4+ (No objectionable content)
- No user-generated content displayed without moderation
- No violence, gambling, or mature themes
- AI-generated content is filtered for safety

**Google Play:** Everyone
- Content rating: IARC questionnaire
- No violence, sexual content, or controlled substances
- User interactions are moderated

---

## 4. Privacy Policy Requirements

- [x] Privacy policy URL accessible without login: https://xuno.app/privacy
- [x] Privacy policy displayed in-app (LegalScreen)
- [x] Privacy policy link in app store listing
- [x] Privacy policy version tracking with re-consent on update
- [x] Data collection disclosed per category
- [x] Third-party SDK data sharing disclosed
- [x] User rights described (access, correct, delete, export)
- [x] Contact information provided
- [x] Effective date and version displayed
- [x] Children's privacy section included

---

## 5. PIPL (Personal Information Protection Law) Compliance

PIPL is China's comprehensive data protection law. Key requirements:

- [x] **Consent basis:** User consent obtained at registration for all data processing
- [x] **Purpose limitation:** Data used only for stated purposes
- [x] **Data minimization:** Only collect data necessary for service
- [x] **Storage limitation:** Data retained only as long as needed
- [x] **Security measures:** AES-256-GCM encryption for sensitive data, TLS in transit
- [x] **User rights:** Access, correction, deletion, export, consent withdrawal
- [x] **Automated decision-making disclosure:** AI recommendations disclosed in privacy policy
- [x] **No cross-border data transfer:** All data stored in PRC servers
- [x] **Third-party SDK disclosure:** All SDKs listed with data practices
- [x] **Data protection impact assessment:** Documented for photo processing
- [x] **Children's privacy:** Users under 14 require guardian consent
- [x] **Consent withdrawal mechanism:** Available in settings
- [x] **Account deletion:** Available in settings with data cleanup

---

## 6. Google Play Data Safety Section

### Data Collected

| Data Type | Collected | Shared | Processed Ephemeral | Encrypted | Deletable |
|-----------|-----------|--------|-------------------|-----------|-----------|
| Personal info (name, email, phone) | Yes | No | No | Yes | Yes |
| Photos and videos | Yes | No | No | Yes | Yes |
| App activity (browsing, interactions) | Yes | No | No | No | Yes |
| Device or other IDs | Yes | No | No | No | No |

### Data Shared with Third Parties

| Data Type | Shared With | Purpose |
|-----------|------------|---------|
| Text prompts | Zhipu AI (GLM) | AI outfit recommendation |
| Photos | Zhipu AI (GLM) | Virtual try-on, body analysis |
| Payment tokens | Alipay/WeChat | Payment processing |
| Device token | Firebase/APNs | Push notifications |

### Data Handling

- Data encrypted in transit: Yes (TLS 1.2+)
- Data encrypted at rest: Yes (AES-256 for sensitive fields)
- User can request data deletion: Yes
- Data cleared after account deletion: Yes (30-day grace period)

---

## 7. Pre-launch Checklist

### App Store (Apple)

- [ ] App Store Connect account created
- [ ] App listing filled (name, subtitle, description, keywords)
- [ ] Screenshots uploaded (6.7", 6.5", 5.5" sizes)
- [ ] App icon uploaded (1024x1024, no alpha)
- [ ] Launch screen storyboard configured
- [ ] Privacy policy URL set in App Store Connect
- [ ] Age rating questionnaire completed
- [ ] Data & Privacy section filled
- [ ] App Review Information provided
- [ ] Build uploaded via Xcode/Transporter
- [ ] In-app purchase review (if applicable)
- [ ] Export compliance (encryption) answered
- [ ] App Tracking Transparency (if applicable) - Not needed

### Google Play (Android)

- [ ] Google Play Console account created
- [ ] Store listing filled (title, short/full description)
- [ ] Screenshots uploaded (phone required, tablet optional)
- [ ] Feature graphic uploaded (1024x500)
- [ ] App icon uploaded (512x512)
- [ ] Content rating questionnaire completed
- [ ] Data safety section filled
- [ ] Privacy policy URL set
- [ ] App signing by Google Play enabled
- [ ] AAB uploaded
- [ ] Internal test track created
- [ ] Closed/open testing tracks (recommended before production)

---

## 8. Key Compliance Risks

| Risk | Mitigation | Status |
|------|-----------|--------|
| User photo privacy | AES-256-GCM encryption, purpose-limited use, user can delete | Mitigated |
| AI-generated content safety | GLM content filtering + custom safety layer | Mitigated |
| Payment data handling | PCI-compliant SDKs, no card data stored | Mitigated |
| Cross-border data transfer | All data in PRC, no international servers | Not applicable |
| Children's data | Age gate, guardian consent for under 14 | Mitigated |
| Third-party SDK compliance | SDK list disclosed, data practices documented | Mitigated |

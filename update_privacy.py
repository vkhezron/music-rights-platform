#!/usr/bin/env python3
import json

# Read the current English translations
with open('public/assets/i18n/en.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Add comprehensive PRIVACY section with proper escaping
privacy_data = {
    "TITLE": "Privacy Policy",
    "LAST_UPDATED": "Last Updated",
    
    # Section 1
    "INTRO_TITLE": "Introduction",
    "INTRO_TEXT": 'Music Rights Platform ("we," "us," "our," or "Company") operates the Music Rights Platform website and application. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.',
    "PASSION_PROJECT": "This Is a Passion Project—Not a Commercial Service",
    "PASSION_1": "This platform is a personal, non-commercial project created by one individual.",
    "PASSION_2": "It is not a registered company, LLC, or legal business entity.",
    "PASSION_3": "There is no dedicated support team, customer service hotline, or Service Level Agreement (SLA).",
    "PASSION_4": 'Features, uptime, and functionality are provided on a "best-effort" basis only.',
    "PASSION_5": "We make no guarantees regarding reliability, availability, accuracy, or fitness for any particular purpose.",
    "NO_LIABILITY": "No Liability for Damages or Losses",
    "NO_LIABILITY_TEXT": "By using this platform, you acknowledge and agree that we bear NO responsibility or liability whatsoever for any losses, damages, data loss, or other consequences arising from your use of this Service. Use entirely at your own risk.",
    "ACKNOWLEDGMENT": "Acknowledgment of Terms",
    "GDPR_COMPLIANCE": "While this is a passion project, we comply with the <strong>General Data Protection Regulation (GDPR)</strong> and applicable European data protection laws.",
    
    # Section 2
    "INVITE_TITLE": "Invite-Only Access & Right to Refuse Service",
    "NOT_PUBLIC": "Not a Public Service",
    "INVITE_ACCESS": "This platform is invite-only and currently in closed beta. Access is granted at our sole discretion.",
    "INVITE_1": "Registration may require an invitation code or manual approval.",
    "INVITE_2": "We do not guarantee access to everyone who requests it.",
    "INVITE_3": "Your access may be revoked at any time without prior notice.",
    "WE_RESERVE": "We Reserve the Right to Refuse Service",
    "RESERVE_1": "We may deny, suspend, or terminate access for any user, at any time, for any reason.",
    "RESERVE_2": "We are not obligated to provide explanations for denial or termination.",
    "RESERVE_3": "We are not liable for any consequences of account suspension or termination.",
    "YOU_ACKNOWLEDGE": "You Acknowledge",
    "ACKNOWLEDGE_1": "This service is experimental, subject to change, and may be discontinued without warning.",
    "ACKNOWLEDGE_2": "There is no entitlement to continued access or uptime.",
    "ACKNOWLEDGE_3": "We make no promises regarding feature availability or data persistence.",
    "ACKNOWLEDGE_4": "Use of this platform is a privilege, not a right.",
    
    # Sections 3-18 continue with same pattern...
    "CONTROLLER_TITLE": "Data Controller & Contact Information",
    "CONTROLLER_TEXT": "The data controller responsible for your personal data is the platform operator.",
    "CONTACT_TITLE": "Contact",
    "CONTACT_TEXT": "For privacy inquiries, use the in-app support feature (if available).",
    "GDPR_REQUESTS": "GDPR Data Subject Requests",
    "GDPR_REQUESTS_TEXT": "For GDPR requests, contact us via the methods above. We respond within 30 days.",
    "DPA_TITLE": "Data Protection Authority",
    "DPA_TEXT": "You may contact your local data protection authority with concerns.",
    
    # Continue with all other sections from the HTML template...
    "COLLECTION_TITLE": "What Information We Collect",
    "VOLUNTARY_TITLE": "Information You Provide (Voluntary)",
    "VOLUNTARY_TEXT": "We collect information you voluntarily provide:",
    "ACCOUNT_INFO": "Account Information",
    "ACCOUNT_INFO_TEXT": "Email, password (hashed), display name, optional profile photo.",
    "PROFILE_INFO": "Profile Data",
    "PROFILE_INFO_TEXT": "Name, pseudonym/nickname, IPI, ISNI, PRO/CMO, contact details.",
    "WORK_INFO": "Musical Works & Metadata",
    "WORK_INFO_TEXT": "Song titles, ISWC codes, ISRC, release dates, collaborators, splits.",
    "RIGHTS_INFO": "Rights Holder Information",
    "RIGHTS_INFO_TEXT": "Composer, lyricist, publisher, performer details, roles, AI disclosures.",
    "SPLIT_INFO": "Protocol & Split Agreements",
    "SPLIT_INFO_TEXT": "Split percentages, signatures, QR codes, PDF protocol documents.",
    "IMPORTANT": "Important",
    "USER_RESPONSIBILITY": "You are solely responsible for the accuracy of any information you upload.",
    "NO_VERIFY": "We do not verify the accuracy of user-provided data.",
    
    "AUTO_TITLE": "Information Collected Automatically",
    "AUTO_TEXT": "We automatically collect technical information:",
    "AUTO_1": "Device information (type, OS, browser)",
    "AUTO_2": "IP address and approximate location",
    "AUTO_3": "Timestamps and session duration",
    "AUTO_4": "Pages visited and features used",
    "AUTO_5": "Error logs and performance metrics",
    "AUTO_PURPOSE": "This data is used for functionality, security, debugging, and improvements.",
    
    "MUSIC_TITLE": "Music Industry-Specific Data",
    "MUSIC_TEXT": "We collect music rights management data:",
    "NICKNAME_LABEL": "Nicknames/Pseudonyms",
    "NICKNAME_TEXT": "Stage names or aliases you use professionally.",
    "IPI_LABEL": "IPI Number",
    "IPI_TEXT": "Unique identifier assigned by performing rights organizations.",
    "ISNI_LABEL": "ISNI",
    "ISNI_TEXT": "International Standard Name Identifier for contributors.",
    "CMO_LABEL": "CMO/PRO Membership",
    "CMO_TEXT": "Your affiliation with organizations like GEMA, ASCAP, PRS.",
    "AI_LABEL": "AI Disclosure",
    "AI_TEXT": "Whether AI was involved in work creation.",
    
    "NICKNAME_SYSTEM": "Nickname/Profile ID System",
    "NICKNAME_1": "We generate a unique profile_id for each user.",
    "NICKNAME_2": "You may create a nickname that links to your profile_id.",
    "NICKNAME_3": "Nicknames are publicly visible if your profile is public.",
    
    "AI_DISCLOSURES": "AI Disclosures",
    "AI_DISC_1": "You may indicate whether a work used AI tools.",
    "AI_DISC_2": "This information appears on public work metadata and protocols.",
    "AI_DISC_3": "Accurate disclosure is your responsibility.",
    
    "DISCLAIMER": "Disclaimer",
    "DISCLAIMER_TEXT": "We are NOT a replacement for legal counsel or professional music publishers. This is a tool for personal record-keeping.",
    
    "LEGAL_BASIS_TITLE": "Legal Basis for Processing (GDPR)",
    "LEGAL_BASIS_TEXT": "We process your data based on:",
    "BASIS_CONTRACT": "Contractual Necessity",
    "BASIS_CONTRACT_TEXT": "To provide our Service (account creation, storing works, protocols).",
    "BASIS_INTEREST": "Legitimate Interests",
    "BASIS_INTEREST_TEXT": "To improve the platform, ensure security, prevent fraud.",
    "BASIS_LEGAL": "Legal Obligations",
    "BASIS_LEGAL_TEXT": "To comply with applicable laws.",
    "BASIS_CONSENT": "Consent",
    "BASIS_CONSENT_TEXT": "Where explicitly requested (marketing, optional features).",
    
    "USAGE_TITLE": "How We Use Your Information",
    "USAGE_TEXT": "We use your personal data to:",
    "USAGE_1": "Create and manage your account.",
    "USAGE_2": "Enable collaboration and rights management.",
    "USAGE_3": "Generate protocol documents and QR codes.",
    "USAGE_4": "Communicate with you (notifications, alerts).",
    "USAGE_5": "Improve platform functionality.",
    "USAGE_6": "Ensure security and prevent abuse.",
    "USAGE_7": "Comply with legal obligations.",
    "NO_ADS": "We do not use your data for advertising or sell it to third parties.",
    "NO_GUARANTEES": "No Guarantees",
    "NO_GUARANTEES_TEXT": "We make no guarantees regarding data accuracy or platform uptime.",
    
    "SHARING_TITLE": "When and How We Share Your Information",
    "PROVIDERS_TITLE": "Service Providers & Infrastructure",
    "PROVIDERS_TEXT": "We use third-party services:",
    "SUPABASE_DESC": "Backend for authentication, database, storage.",
    "SUPABASE_1": "Data Location: EU region (GDPR-compliant)",
    "SUPABASE_2": "Data Processed: Email, passwords, profiles, works, protocols",
    "SUPABASE_3": "Security: TLS/SSL encryption, access controls",
    "SUPABASE_4": "Privacy Policy",
    "SUPABASE_5": "Uses sub-processors (AWS) with GDPR-compliant DPAs.",
    
    "AUTH_STORAGE": "Authentication & Session Storage",
    "AUTH_STORAGE_TEXT": "Supabase uses tokens stored in browser localStorage for sessions.",
    
    "NETLIFY_DESC": "Frontend hosting and content delivery.",
    "NETLIFY_1": "Data Processed: IP addresses, browser data",
    "NETLIFY_2": "Security: HTTPS encryption, DDoS protection",
    "NETLIFY_3": "Privacy Policy",
    
    "PROVIDERS_DISCLAIMER": "We cannot guarantee third-party provider security or uptime.",
    
    "COLLAB_TITLE": "Collaboration & Shared Workspaces",
    "COLLAB_TEXT": "When collaborating, your shared data is visible to collaborators.",
    "COLLAB_1": "You control what information you share.",
    "COLLAB_2": "We are not responsible for how others use shared information.",
    "COLLAB_3": "Be cautious about workspace access.",
    
    "LEGAL_REQ_TITLE": "Legal Requirements",
    "LEGAL_REQ_TEXT": "We may disclose information if required by law:",
    "LEGAL_1": "Comply with subpoenas or court orders.",
    "LEGAL_2": "Enforce our Terms of Service.",
    "LEGAL_3": "Protect rights, property, or safety.",
    "LEGAL_LIMITATION": "As a passion project, our ability to contest legal requests is limited.",
    
    "TRANSFER_TITLE": "International Data Transfers",
    "TRANSFER_TEXT": "Data is primarily stored in the EU. Some sub-processors operate globally with adequate safeguards (Standard Contractual Clauses, GDPR-compliant DPAs).",
    
    "COOKIES_TITLE": "Cookies, Local Storage & Tracking",
    "COOKIES_SUB": "What Are Cookies?",
    "COOKIES_TEXT": "We do NOT use traditional tracking cookies or analytics services.",
    "COOKIES_AUTH": "Supabase uses secure tokens in localStorage for authentication.",
    
    "STORAGE_TITLE": "What We Store Locally",
    "STORAGE_TEXT": "We use browser localStorage for:",
    "STORAGE_1": "Authentication tokens",
    "STORAGE_2": "User preferences (workspace, theme)",
    "STORAGE_LOCAL": "This data remains on your device.",
    
    "NO_TRACK_TITLE": "No Third-Party Tracking",
    "NO_TRACK_TEXT": "We do not use Google Analytics, Facebook Pixel, or similar tools.",
    "FUTURE_CHANGE": "If we add analytics, we will update this policy and obtain consent.",
    
    "QR_TITLE": "QR Code Scanning",
    "QR_TEXT": "Our QR code scanning functionality:",
    "QR_1_LABEL": "Browser Camera Access",
    "QR_1": "We request temporary camera access via browser permissions.",
    "QR_2_LABEL": "Data Processing",
    "QR_2": "Camera stream is processed locally in your browser. No video uploaded.",
    "QR_3_LABEL": "QR Code Data",
    "QR_3": "If a QR code contains a protocol ID, we query our database.",
    "QR_4_LABEL": "Privacy",
    "QR_4": "We do not store camera images or video.",
    
    "RETENTION_TITLE": "Data Retention & Deletion",
    "RETENTION_TEXT": "We retain data only as long as necessary.",
    "DELETION_TITLE": "Account Deletion",
    "DELETION_TEXT": "You may request account deletion at any time.",
    
    "PERIODS_TITLE": "Retention Periods",
    "PERIOD_1_LABEL": "Active Accounts",
    "PERIOD_1": "Data retained while account is active.",
    "PERIOD_2_LABEL": "Deleted Accounts",
    "PERIOD_2": "Personal data deleted within 30 days.",
    "PERIOD_3_LABEL": "Shared Data",
    "PERIOD_3": "Shared work metadata may remain visible to collaborators.",
    "PERIOD_4_LABEL": "Backups",
    "PERIOD_4": "Backups persist for up to 90 days.",
    "PERIOD_5_LABEL": "Legal Holds",
    "PERIOD_5": "Data subject to legal investigation retained until resolved.",
    "PERIOD_6_LABEL": "Logs",
    "PERIOD_6": "Server logs retained for up to 12 months.",
    
    "DISCONTINUE_TITLE": "Service Discontinuation",
    "DISCONTINUE_TEXT": "If we discontinue, we will make reasonable efforts to notify users and provide data export.",
    
    "RIGHTS_TITLE": "Your Rights Under GDPR",
    "RIGHTS_TEXT": "You have the following rights:",
    "RIGHT_1": "Right to Access",
    "RIGHT_1_TEXT": "Request a copy of your personal data.",
    "RIGHT_2": "Right to Rectification",
    "RIGHT_2_TEXT": "Correct inaccurate data.",
    "RIGHT_3": "Right to Erasure",
    "RIGHT_3_TEXT": "Request deletion of your data.",
    "RIGHT_4": "Right to Restrict Processing",
    "RIGHT_4_TEXT": "Limit how we use your data.",
    "RIGHT_5": "Right to Data Portability",
    "RIGHT_5_TEXT": "Receive your data in machine-readable format.",
    "RIGHT_6": "Right to Object",
    "RIGHT_6_TEXT": "Object to processing based on legitimate interests.",
    "RIGHT_7": "Right to Withdraw Consent",
    "RIGHT_7_TEXT": "Withdraw consent at any time.",
    
    "EXERCISE_TITLE": "How to Exercise Your Rights",
    "EXERCISE_LABEL": "To exercise rights:",
    "EXERCISE_1": "Contact us using the information in Section 3.",
    "EXERCISE_2": "We respond within 30 days.",
    "EXERCISE_3": "We may verify your identity.",
    
    "LIMITATIONS": "Limitations",
    "LIMITATIONS_TEXT": "Certain rights may be limited by legal obligations.",
    
    "COMPLAINT": "Right to Lodge a Complaint",
    "COMPLAINT_TEXT": "File complaints with your local data protection authority.",
    
    "SECURITY_TITLE": "Data Security",
    "SECURITY_TEXT": "We take reasonable security measures:",
    "SECURITY_1": "Encryption: HTTPS/TLS for data transmission.",
    "SECURITY_2": "Hashed Passwords: Using bcrypt.",
    "SECURITY_3": "Access Controls: Limited backend access.",
    "SECURITY_4": "Regular Updates: Security patches applied.",
    
    "HOWEVER": "However",
    "SECURITY_LIMITS": "No system is 100% secure. We lack enterprise-grade security measures. Use at your own risk.",
    
    "BEST_PRACTICES": "Your Responsibility",
    "PRACTICE_1": "Use a strong, unique password.",
    "PRACTICE_2": "Do not share login credentials.",
    "PRACTICE_3": "Log out from shared devices.",
    "PRACTICE_4": "Report suspicious activity immediately.",
    
    "BREACH_TITLE": "Data Breach Notification",
    "BREACH_TEXT": "We will notify you and authorities within 72 hours of a breach.",
    
    "CHILDREN_TITLE": "Children's Privacy",
    "CHILDREN_TEXT": "This Service is not for individuals under 16. We do not knowingly collect data from children.",
    
    "WARRANTY_TITLE": "No Warranties or Guarantees",
    "WARRANTY_TEXT": 'THIS SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES.',
    "WARRANTY_LIST": "We make no guarantees regarding uptime, accuracy, data backup, or legal validity of documents.",
    "USE_RISK": "You use this platform entirely at your own risk.",
    
    "LIABILITY_TITLE": "Limitation of Liability",
    "LIABILITY_TEXT": "WE SHALL NOT BE LIABLE FOR ANY:",
    "LIABILITY_LIST": "Direct, indirect, consequential damages; loss of data, revenue, or profits; errors or breaches; downtime or interruptions; third-party actions.",
    "LIABILITY_ACK": "This is a free, experimental project. We bear no legal responsibility. Seek commercial alternatives if you need guaranteed reliability.",
    
    "CHANGES_TITLE": "Changes to This Privacy Policy",
    "CHANGES_TEXT": 'We may update this policy. Changes posted with updated "Last Updated" date.',
    "CONTINUED_USE": "Continued use after changes constitutes acceptance.",
    
    "ACCEPTANCE_TITLE": "Acceptance of This Policy",
    "BY_USING": "By using the Music Rights Platform, you acknowledge:",
    "ACCEPT_1": "This is a passion project, not a commercial service.",
    "ACCEPT_2": "No guarantees of uptime, accuracy, or reliability.",
    "ACCEPT_3": "We bear no liability for damages or losses.",
    "ACCEPT_4": "We may deny or terminate access at any time.",
    "ACCEPT_5": "You understand your GDPR rights.",
    "ACCEPT_6": "You accept the risks of using an experimental platform.",
    "NO_AGREE": "If you do not agree, do not use this Service.",
    
    "CONTACT_SECTION": "Contact Information & Complaints",
    "NO_SUPPORT": "No dedicated support team. Responses may be delayed.",
    "USE_INAPP": "Use the in-app support feature or contact info in Section 3.",
    "SERIOUS_CONCERNS": "For Serious Privacy Concerns",
    "DPA_CONTACT": "Contact your local Data Protection Authority:",
    
    "FOOTER": "This is a passion project. Use at your own risk."
}

data['PRIVACY'] = privacy_data

# Write back
with open('public/assets/i18n/en.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✅ English privacy translations added successfully!")

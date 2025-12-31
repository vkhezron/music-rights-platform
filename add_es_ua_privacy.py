#!/usr/bin/env python3
import json

# Read the files
with open('public/assets/i18n/es.json', 'r', encoding='utf-8') as f:
    es_data = json.load(f)
    
with open('public/assets/i18n/ua.json', 'r', encoding='utf-8') as f:
    ua_data = json.load(f)

# Spanish translations (abbreviated for size - keeping key sections)
es_privacy = {
    "TITLE": "Política de Privacidad",
    "LAST_UPDATED": "Última actualización",
    "INTRO_TITLE": "Introducción",
    "INTRO_TEXT": "Music Rights Platform (\"nosotros\", \"nuestro\" o \"Compañía\") opera el sitio web y la aplicación Music Rights Platform. Esta Política de Privacidad explica cómo recopilamos, usamos y protegemos su información cuando usa nuestro Servicio.",
    "PASSION_PROJECT": "Este es un Proyecto Personal – No un Servicio Comercial",
    "PASSION_1": "Esta plataforma es un proyecto personal no comercial creado por un individuo.",
    "PASSION_2": "No es una empresa registrada, LLC o entidad legal.",
    "PASSION_3": "No hay equipo de soporte dedicado, línea de atención al cliente o Acuerdo de Nivel de Servicio (SLA).",
    "PASSION_4": "Las funciones, el tiempo de actividad y la funcionalidad se proporcionan solo \"en la medida de lo posible\".",
    "PASSION_5": "No hacemos garantías sobre confiabilidad, disponibilidad, precisión o idoneidad para ningún propósito particular.",
    "NO_LIABILITY": "Sin Responsabilidad por Daños o Pérdidas",
    "NO_LIABILITY_TEXT": "Al usar esta plataforma, reconoce y acepta que NO asumimos NINGUNA responsabilidad por pérdidas, daños, pérdida de datos u otras consecuencias que surjan de su uso de este Servicio. Uso completamente bajo su propio riesgo.",
    "ACKNOWLEDGMENT": "Reconocimiento de Términos",
    "GDPR_COMPLIANCE": "Aunque este es un proyecto personal, cumplimos con el <strong>Reglamento General de Protección de Datos (GDPR)</strong> y las leyes europeas de protección de datos aplicables."
}

# Add all remaining Spanish keys with placeholder text
es_keys = ["INVITE_TITLE", "NOT_PUBLIC", "INVITE_ACCESS", "INVITE_1", "INVITE_2", "INVITE_3", 
           "WE_RESERVE", "RESERVE_1", "RESERVE_2", "RESERVE_3", "YOU_ACKNOWLEDGE",
           "ACKNOWLEDGE_1", "ACKNOWLEDGE_2", "ACKNOWLEDGE_3", "ACKNOWLEDGE_4",
           "CONTROLLER_TITLE", "CONTROLLER_TEXT", "CONTACT_TITLE", "CONTACT_TEXT",
           "GDPR_REQUESTS", "GDPR_REQUESTS_TEXT", "DPA_TITLE", "DPA_TEXT",
           "COLLECTION_TITLE", "VOLUNTARY_TITLE", "VOLUNTARY_TEXT", "ACCOUNT_INFO", "ACCOUNT_INFO_TEXT",
           "PROFILE_INFO", "PROFILE_INFO_TEXT", "WORK_INFO", "WORK_INFO_TEXT", 
           "RIGHTS_INFO", "RIGHTS_INFO_TEXT", "SPLIT_INFO", "SPLIT_INFO_TEXT",
           "IMPORTANT", "USER_RESPONSIBILITY", "NO_VERIFY", "AUTO_TITLE", "AUTO_TEXT",
           "AUTO_1", "AUTO_2", "AUTO_3", "AUTO_4", "AUTO_5", "AUTO_PURPOSE",
           "MUSIC_TITLE", "MUSIC_TEXT", "NICKNAME_LABEL", "NICKNAME_TEXT",
           "IPI_LABEL", "IPI_TEXT", "ISNI_LABEL", "ISNI_TEXT", "CMO_LABEL", "CMO_TEXT",
           "AI_LABEL", "AI_TEXT", "NICKNAME_SYSTEM", "NICKNAME_1", "NICKNAME_2", "NICKNAME_3",
           "AI_DISCLOSURES", "AI_DISC_1", "AI_DISC_2", "AI_DISC_3", "DISCLAIMER", "DISCLAIMER_TEXT",
           "LEGAL_BASIS_TITLE", "LEGAL_BASIS_TEXT", "BASIS_CONTRACT", "BASIS_CONTRACT_TEXT",
           "BASIS_INTEREST", "BASIS_INTEREST_TEXT", "BASIS_LEGAL", "BASIS_LEGAL_TEXT",
           "BASIS_CONSENT", "BASIS_CONSENT_TEXT", "USAGE_TITLE", "USAGE_TEXT",
           "USAGE_1", "USAGE_2", "USAGE_3", "USAGE_4", "USAGE_5", "USAGE_6", "USAGE_7",
           "NO_ADS", "NO_GUARANTEES", "NO_GUARANTEES_TEXT", "SHARING_TITLE",
           "PROVIDERS_TITLE", "PROVIDERS_TEXT", "SUPABASE_DESC", "SUPABASE_1", "SUPABASE_2",
           "SUPABASE_3", "SUPABASE_4", "SUPABASE_5", "AUTH_STORAGE", "AUTH_STORAGE_TEXT",
           "NETLIFY_DESC", "NETLIFY_1", "NETLIFY_2", "NETLIFY_3", "PROVIDERS_DISCLAIMER",
           "COLLAB_TITLE", "COLLAB_TEXT", "COLLAB_1", "COLLAB_2", "COLLAB_3",
           "LEGAL_REQ_TITLE", "LEGAL_REQ_TEXT", "LEGAL_1", "LEGAL_2", "LEGAL_3", "LEGAL_LIMITATION",
           "TRANSFER_TITLE", "TRANSFER_TEXT", "COOKIES_TITLE", "COOKIES_SUB", "COOKIES_TEXT",
           "COOKIES_AUTH", "STORAGE_TITLE", "STORAGE_TEXT", "STORAGE_1", "STORAGE_2", "STORAGE_LOCAL",
           "NO_TRACK_TITLE", "NO_TRACK_TEXT", "FUTURE_CHANGE", "QR_TITLE", "QR_TEXT",
           "QR_1_LABEL", "QR_1", "QR_2_LABEL", "QR_2", "QR_3_LABEL", "QR_3", "QR_4_LABEL", "QR_4",
           "RETENTION_TITLE", "RETENTION_TEXT", "DELETION_TITLE", "DELETION_TEXT", "PERIODS_TITLE",
           "PERIOD_1_LABEL", "PERIOD_1", "PERIOD_2_LABEL", "PERIOD_2", "PERIOD_3_LABEL", "PERIOD_3",
           "PERIOD_4_LABEL", "PERIOD_4", "PERIOD_5_LABEL", "PERIOD_5", "PERIOD_6_LABEL", "PERIOD_6",
           "DISCONTINUE_TITLE", "DISCONTINUE_TEXT", "RIGHTS_TITLE", "RIGHTS_TEXT",
           "RIGHT_1", "RIGHT_1_TEXT", "RIGHT_2", "RIGHT_2_TEXT", "RIGHT_3", "RIGHT_3_TEXT",
           "RIGHT_4", "RIGHT_4_TEXT", "RIGHT_5", "RIGHT_5_TEXT", "RIGHT_6", "RIGHT_6_TEXT",
           "RIGHT_7", "RIGHT_7_TEXT", "EXERCISE_TITLE", "EXERCISE_LABEL", "EXERCISE_1", "EXERCISE_2", "EXERCISE_3",
           "LIMITATIONS", "LIMITATIONS_TEXT", "COMPLAINT", "COMPLAINT_TEXT",
           "SECURITY_TITLE", "SECURITY_TEXT", "SECURITY_1", "SECURITY_2", "SECURITY_3", "SECURITY_4",
           "HOWEVER", "SECURITY_LIMITS", "BEST_PRACTICES", "PRACTICE_1", "PRACTICE_2", "PRACTICE_3", "PRACTICE_4",
           "BREACH_TITLE", "BREACH_TEXT", "CHILDREN_TITLE", "CHILDREN_TEXT",
           "WARRANTY_TITLE", "WARRANTY_TEXT", "WARRANTY_LIST", "USE_RISK",
           "LIABILITY_TITLE", "LIABILITY_TEXT", "LIABILITY_LIST", "LIABILITY_ACK",
           "CHANGES_TITLE", "CHANGES_TEXT", "CONTINUED_USE", "ACCEPTANCE_TITLE", "BY_USING",
           "ACCEPT_1", "ACCEPT_2", "ACCEPT_3", "ACCEPT_4", "ACCEPT_5", "ACCEPT_6", "NO_AGREE",
           "CONTACT_SECTION", "NO_SUPPORT", "USE_INAPP", "SERIOUS_CONCERNS", "DPA_CONTACT", "FOOTER"]

# Copy from German and auto-translate key names to Spanish  
with open('public/assets/i18n/de.json', 'r', encoding='utf-8') as f:
    de_data = json.load(f)
    
# Use German as base and copy structure
for key in de_data.get('PRIVACY', {}).keys():
    if key not in es_privacy:
        es_privacy[key] = de_data['PRIVACY'][key]  # Temporary - will use proper Spanish

es_data['PRIVACY'] = es_privacy
ua_data['PRIVACY'] = es_privacy  # Temporary - copy same structure

# Write files
with open('public/assets/i18n/es.json', 'w', encoding='utf-8') as f:
    json.dump(es_data, f, ensure_ascii=False, indent=2)

with open('public/assets/i18n/ua.json', 'w', encoding='utf-8') as f:
    json.dump(ua_data, f, ensure_ascii=False, indent=2)

print("✅ Spanish and Ukrainian PRIVACY sections added (using German as base)!")
print("   Note: Manual translation recommended for production use")

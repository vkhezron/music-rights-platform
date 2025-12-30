import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <h1>Privacy Policy</h1>
        <p class="last-updated">Last Updated: January 1, 2025</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Music Rights Platform ("we," "us," "our," or "Company") operates the Music Rights Platform website and mobile application (collectively, the "Service").
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Service.
          </p>
          <p>
            Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do not use our Service.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          
          <h3>2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Email, password, display name, nickname, avatar</li>
            <li><strong>Profile Information:</strong> Primary role, secondary roles, bio, language preference, social media links</li>
            <li><strong>Work Information:</strong> Work titles, ISRC codes, ISWC codes, duration, genre, languages</li>
            <li><strong>Rights Holder Information:</strong> Name, company, email, phone, CMO/PRO details, IPI numbers</li>
            <li><strong>Split Information:</strong> Ownership percentages, role assignments, notes</li>
          </ul>

          <h3>2.2 Information Automatically Collected</h3>
          <ul>
            <li>Device information (browser type, IP address, operating system)</li>
            <li>Usage information (pages visited, time spent, clicks)</li>
            <li>Authentication tokens and session data</li>
            <li>Error logs and performance data</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain the Service</li>
            <li>To process your transactions and send related information</li>
            <li>To email you regarding your account or Service</li>
            <li>To fulfill and manage your requests and orders</li>
            <li>To generate and analyze usage statistics</li>
            <li>To improve the Service and develop new features</li>
            <li>To detect, prevent, and address fraud and security issues</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Sharing and Disclosure</h2>
          
          <h3>4.1 Third-Party Service Providers</h3>
          <p>We share your information with:</p>
          <ul>
            <li><strong>Supabase:</strong> Cloud database and authentication provider</li>
            <li><strong>Analytics Services:</strong> To understand how users interact with our Service</li>
            <li><strong>Error Tracking:</strong> To monitor and fix application errors</li>
          </ul>

          <h3>4.2 Rights Holders and Collaborators</h3>
          <p>
            Information you share about works and splits may be visible to other users with whom you collaborate or share access.
          </p>

          <h3>4.3 Legal Requirements</h3>
          <p>
            We may disclose your information when required by law or when we believe in good faith that disclosure is necessary to:
          </p>
          <ul>
            <li>Comply with applicable laws, regulations, or legal processes</li>
            <li>Enforce our Terms of Service</li>
            <li>Protect our or others' rights, privacy, safety, or property</li>
            <li>Prevent fraud or security breaches</li>
          </ul>
        </section>

        <section>
          <h2>5. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to provide the Service.
          </p>
          <p>
            You can request deletion of your account and all associated data at any time through your account settings.
          </p>
        </section>

        <section>
          <h2>6. Your Privacy Rights (GDPR & CCPA)</h2>
          
          <h3>6.1 GDPR Rights (EU residents)</h3>
          <ul>
            <li><strong>Right of Access:</strong> Request a copy of your personal data</li>
            <li><strong>Right to Rectification:</strong> Correct inaccurate data</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your data</li>
            <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
            <li><strong>Right to Data Portability:</strong> Export your data in a structured format</li>
            <li><strong>Right to Object:</strong> Object to processing of your data</li>
          </ul>

          <h3>6.2 Exercising Your Rights</h3>
          <p>
            You can exercise these rights by contacting us at support@musicrightsplatform.com or through your account settings.
          </p>
        </section>

        <section>
          <h2>7. Data Security</h2>
          <p>
            We implement appropriate technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
          </p>
          <p>
            However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your information.
          </p>
        </section>

        <section>
          <h2>8. Cookies and Tracking</h2>
          <p>
            We use cookies and similar tracking technologies to:
          </p>
          <ul>
            <li>Remember your preferences</li>
            <li>Understand how you use the Service</li>
            <li>Improve the Service</li>
          </ul>
          <p>
            You can control cookie settings through your browser preferences. However, disabling cookies may affect functionality of the Service.
          </p>
        </section>

        <section>
          <h2>9. Children's Privacy</h2>
          <p>
            The Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
          </p>
          <p>
            If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information immediately.
          </p>
        </section>

        <section>
          <h2>10. International Data Transfers</h2>
          <p>
            Your information may be transferred to, stored in, and processed in countries other than your country of residence.
          </p>
          <p>
            By using the Service, you consent to the transfer of your information to countries outside your country of residence.
          </p>
        </section>

        <section>
          <h2>11. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date of this Policy.
          </p>
          <p>
            Your continued use of the Service following the posting of changes constitutes your acceptance of such changes.
          </p>
        </section>

        <section>
          <h2>12. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our privacy practices, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> privacy@musicrightsplatform.com<br />
            <strong>Mailing Address:</strong> Music Rights Platform, [Address], [City], [Country]
          </p>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      min-height: 100vh;
      background-color: #f7fafc;
      padding: 40px 20px;
    }

    .legal-container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 60px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      line-height: 1.8;
      color: #1a202c;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 10px;
      color: #667eea;
    }

    .last-updated {
      color: #999;
      font-size: 0.95rem;
      margin-bottom: 40px;
    }

    section {
      margin-bottom: 40px;
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 20px;
      margin-top: 30px;
      color: #2d3748;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    h3 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-top: 20px;
      margin-bottom: 10px;
      color: #4a5568;
    }

    p {
      margin-bottom: 15px;
      text-align: justify;
    }

    ul {
      margin-left: 20px;
      margin-bottom: 15px;
    }

    li {
      margin-bottom: 10px;
      text-align: justify;
    }

    strong {
      color: #2d3748;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .legal-container {
        padding: 30px;
      }

      h1 {
        font-size: 2rem;
      }

      h2 {
        font-size: 1.3rem;
      }
    }
  `]
})
export class PrivacyPolicyComponent {}

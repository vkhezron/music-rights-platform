import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-terms-of-service',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <h1>Terms of Service</h1>
        <p class="last-updated">Last Updated: January 1, 2025</p>

        <section>
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing and using the Music Rights Platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>
          <p>
            If you do not agree to abide by the above, please do not use this service.
          </p>
        </section>

        <section>
          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of the materials (information or software) on Music Rights Platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul>
            <li>Modifying or copying the materials</li>
            <li>Using the materials for any commercial purpose or for any public display</li>
            <li>Attempting to decompile or reverse engineer any software contained on the Service</li>
            <li>Removing any copyright or other proprietary notations from the materials</li>
            <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
            <li>Violating any applicable laws or regulations related to access to or use of the Service</li>
          </ul>
        </section>

        <section>
          <h2>3. Disclaimer</h2>
          <p>
            The materials on Music Rights Platform are provided on an 'as is' basis. Music Rights Platform makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
        </section>

        <section>
          <h2>4. Limitations</h2>
          <p>
            In no event shall Music Rights Platform or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the Service, even if Music Rights Platform or an authorized representative has been notified orally or in writing of the possibility of such damage.
          </p>
        </section>

        <section>
          <h2>5. Accuracy of Materials</h2>
          <p>
            The materials appearing on Music Rights Platform could include technical, typographical, or photographic errors. Music Rights Platform does not warrant that any of the materials on the Service are accurate, complete, or current. Music Rights Platform may make changes to the materials contained on the Service at any time without notice.
          </p>
        </section>

        <section>
          <h2>6. Materials and Content</h2>
          <p>
            The materials and content on Music Rights Platform are owned or controlled by Music Rights Platform or by parties that have licensed their material to Music Rights Platform. You are granted a limited license to access and use the materials and content solely for purposes related to using the Service.
          </p>
          <p>
            You may not:
          </p>
          <ul>
            <li>Republish materials from the Service without proper attribution</li>
            <li>Sell, rent, or sub-license materials from the Service</li>
            <li>Reproduce, duplicate, copy, or otherwise exploit materials on the Service for commercial purposes</li>
            <li>Redistribute materials from the Service</li>
          </ul>
        </section>

        <section>
          <h2>7. User Responsibilities</h2>
          <p>
            You agree that you are responsible for:
          </p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>Accepting responsibility for all activities that occur under your account</li>
            <li>Ensuring all information you provide is accurate and complete</li>
            <li>Complying with all applicable laws and regulations</li>
            <li>Not violating the intellectual property rights of others</li>
          </ul>
        </section>

        <section>
          <h2>8. Intellectual Property Rights</h2>
          <p>
            The Service and all of its original content, features, and functionality are the exclusive property of Music Rights Platform and are protected by international copyright, trademark, and other intellectual property laws.
          </p>
          <p>
            You retain all rights to content you create and upload to the Service (works, splits, rights holder information). By uploading content, you grant Music Rights Platform a non-exclusive, royalty-free, worldwide license to use such content solely for operating and improving the Service.
          </p>
        </section>

        <section>
          <h2>9. User-Generated Content</h2>
          <p>
            You are solely responsible for the content you submit to the Service. You represent and warrant that:
          </p>
          <ul>
            <li>You own or have the necessary rights to the content you submit</li>
            <li>Your content does not violate any third-party rights</li>
            <li>Your content complies with all applicable laws and regulations</li>
            <li>Your content is not defamatory, obscene, or otherwise harmful</li>
          </ul>
          <p>
            Music Rights Platform reserves the right to remove any content that violates these terms.
          </p>
        </section>

        <section>
          <h2>10. Collaboration and Sharing</h2>
          <p>
            When you collaborate with other users through the Service, you may share information about works and splits. You are responsible for ensuring that all information you share is accurate and that you have the authority to share such information.
          </p>
          <p>
            Music Rights Platform is not responsible for disputes between collaborators regarding rights ownership or compensation.
          </p>
        </section>

        <section>
          <h2>11. Account Termination</h2>
          <p>
            Music Rights Platform may terminate your account and access to the Service at any time, without notice, for conduct that Music Rights Platform believes violates these Terms of Service or is otherwise harmful to the interests of Music Rights Platform, other users, or third parties.
          </p>
          <p>
            Upon termination, your right to use the Service will immediately cease, though you may request a copy of your data for backup purposes.
          </p>
        </section>

        <section>
          <h2>12. Limitation of Liability</h2>
          <p>
            IN NO EVENT SHALL MUSIC RIGHTS PLATFORM, NOR ITS OFFICERS, DIRECTORS AND EMPLOYEES, BE HELD LIABLE FOR ANYTHING ARISING OUT OF OR IN ANY WAY CONNECTED WITH YOUR USE OF THIS SERVICE WHETHER SUCH LIABILITY IS UNDER CONTRACT, TORT OR OTHERWISE, AND WHETHER OR NOT THE SAID COMPANY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
          </p>
        </section>

        <section>
          <h2>13. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Music Rights Platform and its owners, operators, officers, directors, employees, and agents from and against any and all claims, damages, losses, costs, and expenses, including reasonable attorney's fees, arising out of or connected with your use of the Service or violation of these Terms of Service.
          </p>
        </section>

        <section>
          <h2>14. Modifications to Terms</h2>
          <p>
            Music Rights Platform may revise these terms of service at any time without notice. By continuing to use the Service, you are agreeing to be bound by the revised terms of service.
          </p>
        </section>

        <section>
          <h2>15. Dispute Resolution</h2>
          <p>
            Any dispute arising out of or in connection with these Terms of Service shall be governed by the laws of [Your Jurisdiction] and shall be exclusively submitted to the courts of [Your Jurisdiction].
          </p>
        </section>

        <section>
          <h2>16. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> support@musicrightsplatform.com<br />
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
export class TermsOfServiceComponent {}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Card className="bg-card border-primary">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary mb-2">
            Privacy Policy & Terms of Service
          </CardTitle>
          <p className="text-center text-gray-400 text-sm">
            Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </CardHeader>
        <CardContent className="space-y-8 text-gray-300">
          
          {/* Privacy Policy Section */}
          <section>
            <h2 className="text-2xl font-bold text-primary mb-4">Privacy Policy</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">1. Introduction</h3>
                <p>
                  Welcome to BEATHEOS ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile application, and services (collectively, the "Service").
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2. Information We Collect</h3>
                <p className="mb-2">We collect information that you provide directly to us, including:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Account Information:</strong> Name, email address, username, password, and profile information</li>
                  <li><strong>Payment Information:</strong> Billing address, payment method details (processed securely through third-party payment processors)</li>
                  <li><strong>Content:</strong> Beats, music files, lyrics, images, and other content you upload or create</li>
                  <li><strong>Communication Data:</strong> Messages, comments, and other communications you send through the platform</li>
                  <li><strong>Usage Data:</strong> Information about how you interact with our Service, including pages visited, features used, and time spent</li>
                  <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
                  <li><strong>AI Service Data:</strong> API keys and preferences for third-party AI services (OpenAI, Anthropic, ElevenLabs, etc.) that you configure</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">3. How We Use Your Information</h3>
                <p className="mb-2">We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Provide, maintain, and improve our Service</li>
                  <li>Process transactions and manage subscriptions</li>
                  <li>Enable AI-powered features and services</li>
                  <li>Facilitate communication between users (artists, producers, etc.)</li>
                  <li>Send you technical notices, updates, and support messages</li>
                  <li>Respond to your comments, questions, and requests</li>
                  <li>Monitor and analyze usage patterns and trends</li>
                  <li>Detect, prevent, and address technical issues and fraudulent activity</li>
                  <li>Personalize your experience and provide relevant content</li>
                  <li>Comply with legal obligations and enforce our terms</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">4. Information Sharing and Disclosure</h3>
                <p className="mb-2">We may share your information in the following circumstances:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Public Profile Information:</strong> Your username, profile picture, and public content are visible to other users</li>
                  <li><strong>Service Providers:</strong> We share data with third-party service providers who perform services on our behalf (payment processing, cloud storage, analytics, etc.)</li>
                  <li><strong>AI Service Providers:</strong> When you use AI features, your content may be processed by third-party AI services (OpenAI, Anthropic, ElevenLabs) according to their privacy policies</li>
                  <li><strong>Business Transfers:</strong> Information may be transferred in connection with a merger, acquisition, or sale of assets</li>
                  <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights and safety</li>
                  <li><strong>With Your Consent:</strong> We may share information for any other purpose with your explicit consent</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">5. Data Storage and Security</h3>
                <p>
                  We use industry-standard security measures to protect your information, including encryption, secure servers, and access controls. However, no method of transmission over the Internet or electronic storage is 100% secure. We store your data on secure servers and use third-party cloud services (Supabase, cloud storage providers) that implement appropriate security measures.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">6. Your Rights and Choices</h3>
                <p className="mb-2">You have the right to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Access, update, or delete your account information</li>
                  <li>Control your privacy settings and public profile visibility</li>
                  <li>Opt out of marketing communications</li>
                  <li>Request a copy of your personal data</li>
                  <li>Withdraw consent for data processing where applicable</li>
                  <li>Delete your account and associated data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">7. Cookies and Tracking Technologies</h3>
                <p>
                  We use cookies, web beacons, and similar tracking technologies to collect information about your browsing behavior, preferences, and interactions with our Service. You can control cookies through your browser settings, but this may affect certain features of our Service.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">8. Children's Privacy</h3>
                <p>
                  Our Service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">9. International Data Transfers</h3>
                <p>
                  Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using our Service, you consent to the transfer of your information to these countries.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">10. Changes to This Privacy Policy</h3>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically.
                </p>
              </div>
            </div>
          </section>

          {/* Terms of Service Section */}
          <section className="pt-8 border-t border-gray-700">
            <h2 className="text-2xl font-bold text-primary mb-4">Terms of Service</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">1. Acceptance of Terms</h3>
                <p>
                  By accessing or using BEATHEOS, you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these Terms, you may not access the Service.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2. Description of Service</h3>
                <p className="mb-2">BEATHEOS is a comprehensive music platform that provides:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>A marketplace for buying and selling beats</li>
                  <li>Music production tools and beat-making software</li>
                  <li>AI-powered lyrics generation and text-to-speech services</li>
                  <li>Cloud storage integration for music files</li>
                  <li>Distribution services for albums and singles</li>
                  <li>Subscription plans for unlimited access to beats</li>
                  <li>Social features for connecting artists and producers</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">3. User Accounts</h3>
                <p className="mb-2">To use certain features, you must:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Create an account with accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Be at least 13 years old (or the age of majority in your jurisdiction)</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                  <li>Accept responsibility for all activities under your account</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">4. User Content and Intellectual Property</h3>
                <p className="mb-2"><strong>Your Content:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                  <li>You retain ownership of all content you upload or create on BEATHEOS</li>
                  <li>By uploading content, you grant us a license to host, display, and distribute your content through the Service</li>
                  <li>You represent that you have all necessary rights to upload and share your content</li>
                  <li>You are responsible for ensuring your content does not infringe on others' rights</li>
                </ul>
                <p className="mb-2"><strong>Prohibited Content:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Content that violates any law or regulation</li>
                  <li>Copyrighted material without authorization</li>
                  <li>Content that is defamatory, harassing, or harmful</li>
                  <li>Malware, viruses, or other harmful code</li>
                  <li>Content that infringes on intellectual property rights</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">5. Beat Licensing and Purchases</h3>
                <p className="mb-2">When you purchase a beat:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>You receive a license to use the beat according to the license terms specified by the producer</li>
                  <li>License terms vary and may include restrictions on commercial use, distribution, or modifications</li>
                  <li>You must respect the producer's intellectual property rights</li>
                  <li>All sales are final unless otherwise specified</li>
                  <li>Refunds are handled on a case-by-case basis</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">6. Subscriptions and Payments</h3>
                <p className="mb-2">Subscription terms:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Subscription fees are billed in advance on a recurring basis</li>
                  <li>You can cancel your subscription at any time</li>
                  <li>Cancellation takes effect at the end of the current billing period</li>
                  <li>We reserve the right to change subscription prices with 30 days' notice</li>
                  <li>All payments are processed securely through third-party payment processors</li>
                  <li>Refunds for subscriptions are provided according to our refund policy</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">7. AI Services and Third-Party Integrations</h3>
                <p className="mb-2">When using AI features:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>You may configure third-party AI services (OpenAI, Anthropic, ElevenLabs, etc.) using your own API keys</li>
                  <li>Your use of third-party AI services is subject to their respective terms of service and privacy policies</li>
                  <li>We are not responsible for the content generated by third-party AI services</li>
                  <li>You are responsible for maintaining the security of your API keys</li>
                  <li>We do not store your API keys in plain text and use encryption for storage</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">8. Cloud Storage Services</h3>
                <p>
                  BEATHEOS integrates with third-party cloud storage services (Dropbox, Google Drive, etc.). Your use of these services is subject to their respective terms of service. We are not responsible for the availability, security, or content of third-party cloud storage services.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">9. Prohibited Activities</h3>
                <p className="mb-2">You agree not to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Upload malicious code or attempt to compromise the Service</li>
                  <li>Impersonate others or provide false information</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Use automated systems to access the Service without authorization</li>
                  <li>Reverse engineer or attempt to extract source code</li>
                  <li>Resell or redistribute beats or content without proper licensing</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">10. Termination</h3>
                <p>
                  We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason we deem necessary. You may terminate your account at any time by contacting us or using account deletion features. Upon termination, your right to use the Service will immediately cease.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">11. Disclaimers and Limitation of Liability</h3>
                <p className="mb-2">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">12. Indemnification</h3>
                <p>
                  You agree to indemnify and hold harmless BEATHEOS, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of your use of the Service, your content, or your violation of these Terms.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">13. Dispute Resolution</h3>
                <p>
                  Any disputes arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except where prohibited by law. You waive any right to a jury trial or to participate in a class action lawsuit.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">14. Changes to Terms</h3>
                <p>
                  We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on this page and updating the "Last Updated" date. Your continued use of the Service after changes become effective constitutes acceptance of the new Terms.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">15. Contact Information</h3>
                <p>
                  If you have any questions about these Terms or our Privacy Policy, please contact us through our contact page or at the email address provided on our website.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">16. Governing Law</h3>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which BEATHEOS operates, without regard to its conflict of law provisions.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">17. Severability</h3>
                <p>
                  If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">18. Entire Agreement</h3>
                <p>
                  These Terms, together with our Privacy Policy, constitute the entire agreement between you and BEATHEOS regarding the use of the Service and supersede all prior agreements and understandings.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="pt-8 border-t border-gray-700">
            <div className="bg-gray-800/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-2">Questions or Concerns?</h3>
              <p className="mb-4">
                If you have any questions about this Privacy Policy or Terms of Service, please contact us:
              </p>
              <ul className="space-y-2">
                <li>Email: Contact us through our <a href="/contact" className="text-primary hover:underline">contact page</a></li>
                <li>Website: <a href="/" className="text-primary hover:underline">www.beatheos.com</a></li>
              </ul>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  )
}

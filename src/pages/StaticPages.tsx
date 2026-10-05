import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Clock,
  HelpCircle,
} from 'lucide-react';

export const AboutUsPage: React.FC = () => {
  return (
    <div className="bg-[#F7F3EA] py-14 min-h-screen text-[#292B30]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="text-center space-y-3">
          <span className="text-[11px] font-semibold text-[#A98B52] uppercase tracking-[0.22em] bg-[#FCFBF8] border border-[#E5E0D5] px-4 py-1.5 rounded-full inline-block">
            Corporate Profile
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#0D0E10] tracking-tight">
            M.A. GROUP OF COMPANIES
          </h1>
          <p className="text-sm text-[#5A5D64] max-w-2xl mx-auto">
            Powering Homes &middot; Building Infrastructure &middot; Inspiring Modern Living Across Pakistan.
          </p>
        </div>

        <div className="bg-[#FCFBF8] rounded-2xl p-8 sm:p-12 border border-[#E5E0D5] shadow-sm space-y-8 text-[#292B30] leading-relaxed text-sm">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#0D0E10] mb-3">Our Legacy &amp; Mission</h2>
            <p className="text-[#5A5D64] leading-relaxed">
              Founded with a commitment to engineering precision and uncompromising product authenticity,
              <strong className="text-[#0D0E10]"> M.A. GROUP OF COMPANIES</strong> has grown to become one of Pakistan&apos;s foremost multi-sector
              distributors. From certified Tier-1 solar energy equipment and 99.99% pure copper electrical infrastructure,
              to Italian-inspired tempered glass built-in hobs, luxury European sanitaryware, and zero-emission electric motorbikes,
              we bring world-class technologies to Pakistani consumers and commercial enterprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-[#E5E0D5]">
            <div className="p-6 rounded-xl bg-[#F7F3EA] border border-[#E5E0D5] space-y-2.5">
              <ShieldCheck className="w-6 h-6 text-[#A98B52]" />
              <div className="font-serif font-bold text-[#0D0E10] text-base">Genuine Manufacturer Quality</div>
              <p className="text-xs text-[#5A5D64] leading-relaxed">
                Direct partnerships with Inverex, Schneider Electric, Pakistan Cables, and global manufacturers ensure zero counterfeit risk.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#F7F3EA] border border-[#E5E0D5] space-y-2.5">
              <Truck className="w-6 h-6 text-[#A98B52]" />
              <div className="font-serif font-bold text-[#0D0E10] text-base">Cash on Delivery Security</div>
              <p className="text-xs text-[#5A5D64] leading-relaxed">
                100% Cash on Delivery across all 150+ Pakistani cities, allowing our customers to verify physical parcel integrity before payment.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#F7F3EA] border border-[#E5E0D5] space-y-2.5">
              <Building2 className="w-6 h-6 text-[#A98B52]" />
              <div className="font-serif font-bold text-[#0D0E10] text-base">Nationwide Presence</div>
              <p className="text-xs text-[#5A5D64] leading-relaxed">
                Direct logistics distribution network and dedicated engineering customer support serving clients across Pakistan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContactUsPage: React.FC = () => {
  const { settings, showToast } = useStore();
  const [formSent, setFormSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
    showToast('Your message has been sent to our customer care desk.', 'success');
  };

  return (
    <div className="bg-[#F7F3EA] py-14 min-h-screen text-[#292B30]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="text-center space-y-2.5">
          <span className="text-[11px] font-semibold text-[#A98B52] uppercase tracking-[0.22em] bg-[#FCFBF8] border border-[#E5E0D5] px-4 py-1.5 rounded-full inline-block">
            Concierge Desk
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#0D0E10] tracking-tight">
            Contact &amp; Customer Care
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5D64] max-w-lg mx-auto">
            Have questions about equipment specifications, bulk orders, or Cash on Delivery? Connect with our team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 bg-[#151C2C] text-[#FCFBF8] rounded-2xl p-8 border border-[#C9B27C]/30 space-y-6 shadow-md">
            <h2 className="font-serif text-xl font-bold tracking-wide text-[#C9B27C]">
              Customer Support
            </h2>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#0D0E10]/60 border border-[#C9B27C]/20 space-y-1.5">
                <div className="font-bold text-[#FCFBF8] text-sm">Direct Online Inquiries</div>
                <div className="text-[#B8B9BC] leading-relaxed">
                  Our engineering and sales desk handles catalog inquiries, order status updates, and commercial quotes.
                </div>
              </div>

              {settings?.showLocations && settings?.headOfficeAddress && (
                <div className="p-4 rounded-xl bg-[#0D0E10]/60 border border-[#C9B27C]/20 space-y-1">
                  <div className="font-bold text-[#FCFBF8] text-sm">Corporate Office</div>
                  <div className="text-[#B8B9BC]">{settings.headOfficeAddress}</div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-[#0D0E10]/60 border border-[#C9B27C]/20 space-y-1">
                <div className="font-bold text-[#FCFBF8] text-sm">Nationwide Cash on Delivery</div>
                <div className="text-[#B8B9BC]">Pay safely upon receipt across 150+ Pakistani cities.</div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#C9B27C]/20 space-y-2.5 text-xs text-[#FCFBF8]">
              {settings?.showHelpline && settings?.contactPhone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#C9B27C]" />
                  <span>Phone: {settings.contactPhone}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#C9B27C]" />
                <span>Email: {settings?.contactEmail || 'info@magroupofcompanies.pk'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#C9B27C]" />
                <span>Mon to Sat: 9:00 AM - 8:00 PM</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#FCFBF8] rounded-2xl p-8 border border-[#E5E0D5] shadow-sm">
            {formSent ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#A98B52] mx-auto" />
                <h3 className="font-serif text-xl font-bold text-[#0D0E10]">Message Received</h3>
                <p className="text-xs text-[#5A5D64]">
                  Our customer care representative will contact you via phone/WhatsApp within 2 business hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <h3 className="font-serif text-xl font-bold text-[#0D0E10] mb-2">
                  Send Us an Inquiry
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold uppercase tracking-[0.12em] text-[11px] text-[#292B30]">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Your name"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#F7F3EA] border border-[#E5E0D5] text-[#0D0E10] placeholder-[#7A7D85] focus:outline-none focus:border-[#C9B27C]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold uppercase tracking-[0.12em] text-[11px] text-[#292B30]">Mobile Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="0300 1234567"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#F7F3EA] border border-[#E5E0D5] text-[#0D0E10] placeholder-[#7A7D85] focus:outline-none focus:border-[#C9B27C]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold uppercase tracking-[0.12em] text-[11px] text-[#292B30]">City in Pakistan</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lahore / Rawalpindi / Multan"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F7F3EA] border border-[#E5E0D5] text-[#0D0E10] placeholder-[#7A7D85] focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold uppercase tracking-[0.12em] text-[11px] text-[#292B30]">Message / Product Inquiry</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write your questions regarding products, technical sizing, or order delivery..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F7F3EA] border border-[#E5E0D5] text-[#0D0E10] placeholder-[#7A7D85] focus:outline-none focus:border-[#C9B27C]"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold uppercase tracking-[0.14em] px-7 py-3.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Send Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ShippingPolicyPage: React.FC = () => {
  return (
    <div className="bg-[#F7F3EA] py-14 min-h-screen text-[#292B30]">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0D0E10] tracking-tight">
          Cash on Delivery (COD) &amp; Shipping Policy
        </h1>

        <div className="bg-[#FCFBF8] rounded-2xl p-8 border border-[#E5E0D5] space-y-6 text-xs text-[#5A5D64] leading-relaxed shadow-sm">
          <div className="p-4 rounded-xl bg-[#151C2C] border border-[#C9B27C]/30 text-[#FCFBF8] font-medium">
            <strong className="text-[#C9B27C]">100% Cash on Delivery Guarantee:</strong> M.A. GROUP OF COMPANIES operates strictly with Cash on Delivery (COD). Customers pay the courier in cash upon doorstep delivery after verifying parcel seals.
          </div>

          <div>
            <h3 className="font-serif text-base font-bold text-[#0D0E10] mb-1.5">1. Delivery Coverage &amp; Logistics Partners</h3>
            <p>
              We deliver to all major cities, towns, and commercial districts across Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan, Islamabad ICT, and Azad Kashmir via authorized express couriers (TCS Express, Leopard Courier, and Trax Logistics).
            </p>
          </div>

          <div>
            <h3 className="font-serif text-base font-bold text-[#0D0E10] mb-1.5">2. Delivery Timelines</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-[#0D0E10]">Major Metros (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad):</strong> 1 to 2 business days.</li>
              <li><strong className="text-[#0D0E10]">Other Cities &amp; Towns across Pakistan:</strong> 2 to 4 business days.</li>
              <li><strong className="text-[#0D0E10]">Heavy Industrial Solar Inverters &amp; Batteries:</strong> 2 to 4 business days with reinforced wooden crate packaging.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-base font-bold text-[#0D0E10] mb-1.5">3. Shipping Charges</h3>
            <p>
              Orders with a subtotal of PKR 50,000 or above qualify for <strong className="text-[#A98B52]">COMPLIMENTARY DELIVERY</strong>. For standard orders below PKR 50,000, a flat courier fee is calculated at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReturnPolicyPage: React.FC = () => {
  return (
    <div className="bg-[#F7F3EA] py-14 min-h-screen text-[#292B30]">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0D0E10] tracking-tight">
          Return, Replacement &amp; Warranty Policy
        </h1>

        <div className="bg-[#FCFBF8] rounded-2xl p-8 border border-[#E5E0D5] space-y-6 text-xs text-[#5A5D64] leading-relaxed shadow-sm">
          <div>
            <h3 className="font-serif text-base font-bold text-[#0D0E10] mb-1.5">1. 7-Day Replacement Guarantee</h3>
            <p>
              If a product arrives damaged during courier transit, has a manufacturing defect, or differs from the catalog description, M.A. GROUP OF COMPANIES provides a direct replacement within 7 days of delivery.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-base font-bold text-[#0D0E10] mb-1.5">2. Official Manufacturer Warranties</h3>
            <p>
              All equipment sold by M.A. GROUP OF COMPANIES carries authentic manufacturer warranty cards (e.g., Inverex 5 Years, Pakistan Cables 100% Pure Copper Guarantee, Corona Hobs 2 Years, Bosch 1 Year). Warranty claim centers are accessible in Lahore, Karachi, Rawalpindi, and Multan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FaqPage: React.FC = () => {
  const faqs = [
    {
      q: 'How does Cash on Delivery (COD) work?',
      a: 'When ordering on M.A. GROUP OF COMPANIES, no upfront payment or bank transfer is needed. Simply enter your delivery address in Pakistan. When the courier arrives, pay the exact cash amount and collect your receipt.',
    },
    {
      q: 'Are your products 100% genuine and original?',
      a: 'Yes. M.A. GROUP OF COMPANIES is an authorized commercial distributor. Products come with authentic manufacturer hologram seals, barcode tracking, and stamped warranty certificates.',
    },
    {
      q: 'How can I track my shipment?',
      a: 'Click on the "Track Order" link in our header or visit #/track-order. Enter your Order ID (e.g. MAG-9214) to view live courier progression from our warehouse to your doorstep.',
    },
    {
      q: 'Do you offer bulk contractor pricing for solar or electrical projects?',
      a: 'Yes. Visit our B2B & Wholesale section or WhatsApp our commercial project team for formal volume quotations and site delivery arrangements.',
    },
  ];

  return (
    <div className="bg-[#F7F3EA] py-14 min-h-screen text-[#292B30]">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2.5">
          <span className="text-[11px] font-semibold text-[#A98B52] uppercase tracking-[0.22em] bg-[#FCFBF8] border border-[#E5E0D5] px-4 py-1.5 rounded-full inline-block">
            Help Center
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#0D0E10] tracking-tight">
            Frequently Asked Questions
          </h1>
        </div>

        <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#E5E0D5] shadow-sm space-y-4">
          {faqs.map((f, idx) => (
            <div key={idx} className="p-5 rounded-xl bg-[#F7F3EA] border border-[#E5E0D5] space-y-1.5">
              <h3 className="font-serif text-base font-bold text-[#0D0E10] flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-[#A98B52] shrink-0" />
                <span>{f.q}</span>
              </h3>
              <p className="text-xs text-[#5A5D64] pl-6.5 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

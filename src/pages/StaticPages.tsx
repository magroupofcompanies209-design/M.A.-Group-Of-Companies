import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  MessageCircle,
  HelpCircle,
} from 'lucide-react';

export const AboutUsPage: React.FC = () => {
  return (
    <div className="bg-neutral-50 py-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full">
            Corporate Profile
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 tracking-tight">
            M.A. GROUP OF COMPANIES
          </h1>
          <p className="text-sm text-neutral-500 max-w-2xl mx-auto">
            Powering Homes &middot; Building Infrastructure &middot; Inspiring Modern Living Across Pakistan.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-neutral-200 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-sm">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">Our Legacy &amp; Mission</h2>
            <p>
              Founded with a commitment to engineering precision and uncompromising product authenticity,
              <strong> M.A. GROUP OF COMPANIES</strong> has grown to become one of Pakistan&apos;s foremost multi-sector
              distributors. From certified Tier-1 solar energy equipment and 99.99% pure copper electrical infrastructure,
              to Italian-inspired tempered glass built-in hobs, luxury European sanitaryware, and zero-emission electric motorbikes,
              we bring world-class technologies to Pakistani consumers and commercial enterprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-neutral-100">
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
              <ShieldCheck className="w-6 h-6 text-amber-600" />
              <div className="font-bold text-neutral-900 text-sm">Genuine Manufacturer Quality</div>
              <p className="text-xs text-neutral-500">
                Direct partnerships with Inverex, Schneider Electric, Pakistan Cables, and global manufacturers ensure zero counterfeit risk.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
              <Truck className="w-6 h-6 text-emerald-600" />
              <div className="font-bold text-neutral-900 text-sm">Cash on Delivery Security</div>
              <p className="text-xs text-neutral-500">
                100% Cash on Delivery across all 150+ Pakistani cities, allowing our customers to verify physical parcel integrity before payment.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              <div className="font-bold text-neutral-900 text-sm">Nationwide Presence</div>
              <p className="text-xs text-neutral-500">
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
    <div className="bg-neutral-50 py-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full">
            Customer Support
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
            Contact &amp; Customer Care
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto">
            Have questions about equipment specifications, bulk orders, or Cash on Delivery? Connect with our team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 bg-neutral-950 text-white rounded-3xl p-8 space-y-6">
            <h2 className="text-lg font-bold uppercase tracking-wider text-amber-400">
              Customer Support
            </h2>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="font-bold text-white text-sm">Direct Online Inquiries</div>
                <div className="text-neutral-400">
                  Our engineering and sales desk handles catalog inquiries, order status updates, and commercial quotes.
                </div>
              </div>

              {settings?.showLocations && settings?.headOfficeAddress && (
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                  <div className="font-bold text-white text-sm">Corporate Office</div>
                  <div className="text-neutral-400">{settings.headOfficeAddress}</div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                <div className="font-bold text-white text-sm">Nationwide Cash on Delivery</div>
                <div className="text-neutral-400">Pay safely upon receipt across 150+ Pakistani cities.</div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800 space-y-2.5 text-xs text-neutral-300">
              {settings?.showHelpline && settings?.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>Phone: {settings.contactPhone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>Email: {settings?.contactEmail || 'info@magroupofcompanies.pk'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Mon to Sat: 9:00 AM - 8:00 PM</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm">
            {formSent ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-neutral-900">Message Received!</h3>
                <p className="text-xs text-neutral-500">
                  Our customer care representative will contact you via phone/WhatsApp within 2 business hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-2">
                  Send Us an Inquiry
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Your name"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Mobile Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="0300 1234567"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">City in Pakistan</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lahore / Rawalpindi / Multan"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Message / Product Inquiry</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write your questions regarding products, technical sizing, or order delivery..."
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer"
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
    <div className="bg-neutral-50 py-12 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
          Cash on Delivery (COD) &amp; Shipping Policy
        </h1>

        <div className="bg-white rounded-3xl p-8 border border-neutral-200 space-y-6 text-xs text-neutral-700 leading-relaxed">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium">
            <strong>100% Cash on Delivery Guarantee:</strong> M.A. GROUP OF COMPANIES operates strictly with Cash on Delivery (COD). Customers pay the courier in cash upon doorstep delivery after verifying parcel seals.
          </div>

          <div>
            <h3 className="text-sm font-bold text-neutral-900 mb-1">1. Delivery Coverage &amp; Logistics Partners</h3>
            <p>
              We deliver to all major cities, towns, and commercial districts across Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan, Islamabad ICT, and Azad Kashmir via authorized express couriers (TCS Express, Leopard Courier, and Trax Logistics).
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-neutral-900 mb-1">2. Delivery Timelines</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Major Metros (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad):</strong> 1 to 2 business days.</li>
              <li><strong>Other Cities &amp; Towns across Pakistan:</strong> 2 to 4 business days.</li>
              <li><strong>Heavy Industrial Solar Inverters &amp; Batteries:</strong> 2 to 4 business days with reinforced wooden crate packaging.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-neutral-900 mb-1">3. Shipping Charges</h3>
            <p>
              Orders with a subtotal of PKR 5,000 or above qualify for <strong>FREE DELIVERY</strong>. For orders below PKR 5,000, a flat standard courier fee of PKR 450 is applied at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReturnPolicyPage: React.FC = () => {
  return (
    <div className="bg-neutral-50 py-12 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
          Return, Replacement &amp; Warranty Policy
        </h1>

        <div className="bg-white rounded-3xl p-8 border border-neutral-200 space-y-6 text-xs text-neutral-700 leading-relaxed">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 mb-1">1. 7-Day Replacement Guarantee</h3>
            <p>
              If a product arrives damaged during courier transit, has a manufacturing defect, or differs from the catalog description, M.A. GROUP OF COMPANIES provides a direct replacement within 7 days of delivery.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-neutral-900 mb-1">2. Official Manufacturer Warranties</h3>
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
      a: 'Click on the "Track Order" link in our header or visit #/track-order. Enter your Order ID (e.g. MAG-9214) to view live courier progression from Lahore Central Warehouse to your doorstep.',
    },
    {
      q: 'Do you offer bulk contractor pricing for solar or electrical projects?',
      a: 'Yes. Visit our B2B & Wholesale section or WhatsApp our commercial project team for formal volume quotations and site delivery arrangements.',
    },
  ];

  return (
    <div className="bg-neutral-50 py-12 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full">
            Help Center
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-neutral-900 tracking-tight">
            Frequently Asked Questions
          </h1>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-4">
          {faqs.map((f, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{f.q}</span>
              </h3>
              <p className="text-xs text-neutral-600 pl-6 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

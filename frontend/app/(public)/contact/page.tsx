"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Send,
  ArrowRight,
  Calendar,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const inputClasses =
  "w-full rounded-lg bg-white border border-gray-200 px-4 py-3 text-[#0F172A] placeholder:text-gray-400 focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/50 transition-colors";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="bg-white text-[#0F172A]">
      {/* Hero + Form Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Page Header */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0F172A] mb-4">
              Get in Touch
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Have questions about Igolo? We&apos;d love to help your interior
              business grow.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left Column: Contact Form */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
            >
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-xl bg-gray-50 border border-gray-200 p-10 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 12,
                        delay: 0.2,
                      }}
                      className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#0D9488]/10"
                    >
                      <CheckCircle2 className="h-8 w-8 text-[#0D9488]" />
                    </motion.div>
                    <h2 className="text-2xl font-semibold text-[#0F172A] mb-2">
                      Thank you for reaching out!
                    </h2>
                    <p className="text-gray-500">
                      We&apos;ll get back to you within 24 hours.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-[#0F172A] mb-1.5"
                        >
                          Full Name <span className="text-[#0D9488]">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          required
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-[#0F172A] mb-1.5"
                        >
                          Email <span className="text-[#0D9488]">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          placeholder="john@company.com"
                          required
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="phone"
                          className="block text-sm font-medium text-[#0F172A] mb-1.5"
                        >
                          Phone Number
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="company"
                          className="block text-sm font-medium text-[#0F172A] mb-1.5"
                        >
                          Company Name
                        </label>
                        <input
                          id="company"
                          type="text"
                          placeholder="Your company"
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium text-[#0F172A] mb-1.5"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        placeholder="Tell us about your requirements..."
                        className={inputClasses + " resize-none"}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0D9488] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#0B7C72] transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      Send Message
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Right Column: Contact Info Cards */}
            <div className="space-y-5">
              {/* Email */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={2}
                className="rounded-xl bg-white border border-gray-200 p-5 flex items-start gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0D9488]/10">
                  <Mail className="h-5 w-5 text-[#0D9488]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-0.5">
                    Email
                  </p>
                  <a
                    href="mailto:hello@igolo.in"
                    className="text-[#0F172A] font-medium hover:text-[#0D9488] transition-colors"
                  >
                    hello@igolo.in
                  </a>
                </div>
              </motion.div>

              {/* Phone */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={3}
                className="rounded-xl bg-white border border-gray-200 p-5 flex items-start gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0D9488]/10">
                  <Phone className="h-5 w-5 text-[#0D9488]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-0.5">
                    Phone
                  </p>
                  <a
                    href="tel:+919876543210"
                    className="text-[#0F172A] font-medium hover:text-[#0D9488] transition-colors"
                  >
                    +91 98765 43210
                  </a>
                </div>
              </motion.div>

              {/* Address */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={4}
                className="rounded-xl bg-white border border-gray-200 p-5 flex items-start gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0D9488]/10">
                  <MapPin className="h-5 w-5 text-[#0D9488]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-0.5">
                    Address
                  </p>
                  <p className="text-[#0F172A] font-medium">
                    Bangalore, India
                  </p>
                </div>
              </motion.div>

              {/* Business Hours */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={5}
                className="rounded-xl bg-white border border-gray-200 p-5 flex items-start gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0D9488]/10">
                  <Clock className="h-5 w-5 text-[#0D9488]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-0.5">
                    Business Hours
                  </p>
                  <p className="text-[#0F172A] font-medium">
                    Mon - Sat, 9 AM - 7 PM IST
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Book a Demo CTA */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D9488]/10">
              <Calendar className="h-7 w-7 text-[#0D9488]" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0F172A] mb-4">
              Book a Demo
            </h2>
            <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
              See Igolo in action. Our team will walk you through every feature
              and answer all your questions.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0D9488] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#0B7C72] transition-colors"
            >
              Schedule a Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

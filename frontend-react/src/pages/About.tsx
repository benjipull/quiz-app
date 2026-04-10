import { Header } from '@/components/layout/Header'
import React from 'react'

const About = () => {
  const privacyPolicyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL || "/privacypolicy.html";

  const openPrivacyPolicy = () => {
    window.open(privacyPolicyUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className='h-full min-h-0 overflow-hidden bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67] flex flex-col'>
      <Header title="About Us" />

      <div className='flex-1 min-h-0 px-4 py-4 pb-[calc(6.2rem+env(safe-area-inset-bottom))] lg:pb-6'>
        <div className='mx-auto h-full w-full max-w-md flex flex-col justify-center gap-4 text-center'>
          <div className='rounded-xl border border-border/70 bg-card/80 px-6 py-5 shadow-lg'>
            <p className='text-sm text-muted-foreground mb-2'>Contact us at</p>
            <a 
              href="mailto:benjamin.pullicino@gmail.com"
              className='text-base sm:text-lg font-semibold text-primary hover:text-accent transition-colors'
            >
             info@quizicle.app
            </a>
          </div>

          <div className='rounded-xl border border-border/70 bg-card/80 px-6 py-5 shadow-lg'>
            <p className='text-sm text-muted-foreground mb-2'>Read how we handle your data</p>
            <button
              type="button"
              onClick={openPrivacyPolicy}
              className='text-base sm:text-lg font-semibold text-primary hover:text-accent transition-colors'
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About

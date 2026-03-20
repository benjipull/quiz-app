import { Header } from '@/components/layout/Header'
import React from 'react'
import logo from '../assets/images/QuizicleLogo.png'

const About = () => {
  const privacyPolicyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL || "/privacypolicy.html";

  const openPrivacyPolicy = () => {
    window.open(privacyPolicyUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-[#100321] via-[#2d1b4e] to-[#380d67]'>
      <Header title="About Us" />

      <div className='px-4 pt-10 pb-24'>
        <div className='mx-auto w-full max-w-md space-y-5 text-center'>
          <div className='rounded-2xl border border-primary/30 bg-card/60 px-6 py-8 shadow-xl backdrop-blur-sm'>
            <img src={logo} alt="Quizicle Logo" className='h-20 w-auto mx-auto object-contain drop-shadow-xl' />
            <p className='mt-4 text-sm text-muted-foreground'>Play. Learn. Compete.</p>
          </div>

          <div className='rounded-xl border border-border/70 bg-card/80 px-8 py-6 shadow-lg'>
            <p className='text-sm text-muted-foreground mb-2'>Contact us at</p>
            <a 
              href="mailto:benjamin.pullicino@gmail.com"
              className='text-lg font-semibold text-primary hover:text-accent transition-colors'
            >
             info@quizicle.app
            </a>
          </div>

          <div className='rounded-xl border border-border/70 bg-card/80 px-8 py-6 shadow-lg'>
            <p className='text-sm text-muted-foreground mb-3'>Read how we handle your data</p>
            <button
              type="button"
              onClick={openPrivacyPolicy}
              className='text-lg font-semibold text-primary hover:text-accent transition-colors'
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
